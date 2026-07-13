import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from services.proxy_service import ClearanceBundle, ProxyRuntimeProfile
from services.register import openai_register


class FakeResponse:
    def __init__(self, status_code=200, text="", headers=None, url="https://auth.openai.com/test", payload=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {}
        self.url = url
        self.payload = payload or {}

    def json(self):
        return self.payload


class FakeCookieJar:
    def __init__(self):
        self.items = []

    def set(self, name, value, domain=None):
        self.items.append({"name": name, "value": value, "domain": domain})


class FakeSession:
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.headers = {}
        self.cookies = FakeCookieJar()
        self.closed = False

    def close(self):
        self.closed = True


class FakeProxySettings:
    def __init__(self, bundle=None):
        self.bundle = bundle
        self.refreshed = False
        self.session_kwargs_calls = []
        self.build_headers_calls = []
        self.refresh_calls = []

    def build_session_kwargs(self, **kwargs):
        self.session_kwargs_calls.append(kwargs)
        return dict(kwargs, proxy="http://runtime.example:8118")

    def get_profile(self, **kwargs):
        return ProxyRuntimeProfile(
            proxy_url="http://runtime.example:8118",
            proxy_source="runtime",
            runtime_enabled=True,
            egress_mode="single_proxy",
            clearance={"enabled": True, "mode": "flaresolverr"},
        )

    def build_headers(self, headers=None, target_url="", proxy="", upstream=True, **kwargs):
        self.build_headers_calls.append({"target_url": target_url, "proxy": proxy, "upstream": upstream})
        merged = dict(headers or {})
        if self.refreshed and self.bundle and self.bundle.cookies:
            merged["Cookie"] = "; ".join(f"{key}={value}" for key, value in self.bundle.cookies.items())
        return merged

    def refresh_clearance(self, target_url="", proxy="", force=False, upstream=True, **kwargs):
        self.refresh_calls.append({"target_url": target_url, "proxy": proxy, "force": force, "upstream": upstream})
        self.refreshed = self.bundle is not None
        return self.bundle


class RegisterProxyRuntimeTests(unittest.TestCase):
    def test_create_session_uses_proxy_settings_without_breaking_existing_proxy_argument(self):
        fake_proxy = FakeProxySettings()
        created = []

        def fake_session_factory(**kwargs):
            session = FakeSession(**kwargs)
            created.append(session)
            return session

        with patch.object(openai_register, "proxy_settings", fake_proxy), patch.object(
            openai_register.requests,
            "Session",
            side_effect=fake_session_factory,
        ):
            session = openai_register.create_session("http://legacy-register.example:8080")

        self.assertIs(session, created[0])
        self.assertEqual(fake_proxy.session_kwargs_calls[0]["proxy"], "http://legacy-register.example:8080")
        self.assertTrue(fake_proxy.session_kwargs_calls[0]["upstream"])
        self.assertEqual(fake_proxy.session_kwargs_calls[0]["impersonate"], "chrome")
        self.assertFalse(fake_proxy.session_kwargs_calls[0]["verify"])
        self.assertEqual(session.kwargs["proxy"], "http://runtime.example:8118")

    def test_cloudflare_without_clearance_keeps_clear_register_error(self):
        fake_proxy = FakeProxySettings(bundle=None)
        cf_response = FakeResponse(
            status_code=403,
            text="<html><title>Just a moment...</title></html>",
            headers={"server": "cloudflare", "content-type": "text/html"},
            url="https://auth.openai.com/api/accounts/authorize",
        )

        with patch.object(openai_register, "proxy_settings", fake_proxy), patch.object(
            openai_register,
            "create_session",
            return_value=FakeSession(),
        ), patch.object(openai_register, "request_with_local_retry", return_value=(cf_response, "")) as request_mock, patch.object(
            openai_register.time,
            "sleep",
        ) as sleep_mock:
            registrar = openai_register.PlatformRegistrar(proxy="http://legacy-register.example:8080")
            with self.assertRaisesRegex(RuntimeError, "Cloudflare") as ctx:
                registrar._platform_authorize("user@example.com", 1)

        self.assertEqual(len(fake_proxy.refresh_calls), 1)
        self.assertEqual(request_mock.call_count, 2)
        sleep_mock.assert_called_once_with(openai_register.AUTHORIZE_CHALLENGE_RETRY_DELAY_SECONDS)
        self.assertIn("status=403", str(ctx.exception))
        self.assertIn("Just a moment", str(ctx.exception))

    def test_cloudflare_without_clearance_retries_once_after_cooldown(self):
        fake_proxy = FakeProxySettings(bundle=None)
        responses = [
            FakeResponse(
                status_code=403,
                text="<html><title>Just a moment...</title></html>",
                headers={"server": "cloudflare", "content-type": "text/html"},
                url="https://auth.openai.com/api/accounts/authorize",
            ),
            FakeResponse(
                status_code=200,
                text="<html><title>Create a password - OpenAI</title></html>",
                headers={"content-type": "text/html; charset=utf-8"},
                url="https://auth.openai.com/create-account/password",
            ),
        ]

        with patch.object(openai_register, "proxy_settings", fake_proxy), patch.object(
            openai_register,
            "create_session",
            return_value=FakeSession(),
        ), patch.object(openai_register, "request_with_local_retry", side_effect=lambda *_args, **_kwargs: (responses.pop(0), "")) as request_mock, patch.object(
            openai_register.time,
            "sleep",
        ) as sleep_mock:
            registrar = openai_register.PlatformRegistrar(proxy="")
            registrar._platform_authorize("user@example.com", 1)

        self.assertEqual(request_mock.call_count, 2)
        self.assertEqual(len(fake_proxy.refresh_calls), 1)
        sleep_mock.assert_called_once_with(openai_register.AUTHORIZE_CHALLENGE_RETRY_DELAY_SECONDS)

    def test_openai_html_behind_cloudflare_is_not_treated_as_challenge(self):
        response = FakeResponse(
            status_code=200,
            text="""
            <!DOCTYPE html><html lang=\"en-US\"><head>
            <title>Create a password - OpenAI</title>
            </head><body>OpenAI account page</body></html>
            """,
            headers={"server": "cloudflare", "content-type": "text/html; charset=utf-8"},
            url="https://auth.openai.com/create-account/password",
        )

        self.assertFalse(openai_register._is_cloudflare_challenge(response))

    def test_create_account_uses_current_server_contract(self):
        request_calls = []

        def fake_request(_session, method, url, **kwargs):
            request_calls.append({"method": method, "url": url, "json": kwargs.get("json")})
            return FakeResponse(status_code=200), ""

        with patch.object(openai_register, "proxy_settings", FakeProxySettings()), patch.object(
            openai_register,
            "create_session",
            return_value=FakeSession(),
        ), patch.object(openai_register, "build_sentinel_token", return_value="sentinel-token"), patch.object(
            openai_register,
            "request_with_local_retry",
            side_effect=fake_request,
        ):
            registrar = openai_register.PlatformRegistrar(proxy="")
            registrar._create_account("Test User", "2000-01-02", 1)

        self.assertEqual(len(request_calls), 1)
        self.assertEqual(request_calls[0]["method"], "post")
        self.assertEqual(request_calls[0]["url"], f"{openai_register.auth_base}/api/accounts/create_account")
        self.assertEqual(request_calls[0]["json"], {"name": "Test User", "birthdate": "2000-01-02"})
        self.assertNotIn("origin_page_type", request_calls[0]["json"])

    def test_create_account_reports_registration_disallowed_as_platform_policy_rejection(self):
        response = FakeResponse(
            status_code=400,
            payload={
                "error": {
                    "code": "registration_disallowed",
                    "message": "Sorry, we cannot create your account with the given information.",
                }
            },
        )

        with patch.object(openai_register, "proxy_settings", FakeProxySettings()), patch.object(
            openai_register,
            "create_session",
            return_value=FakeSession(),
        ), patch.object(openai_register, "build_sentinel_token", return_value="sentinel-token"), patch.object(
            openai_register,
            "request_with_local_retry",
            return_value=(response, ""),
        ):
            registrar = openai_register.PlatformRegistrar(proxy="")
            with self.assertRaisesRegex(RuntimeError, "平台拒绝该注册信息"):
                registrar._create_account("Test User", "2000-01-02", 1)

    def test_cloudflare_challenge_refreshes_clearance_and_retries_once_with_matching_headers(self):
        bundle = ClearanceBundle(
            target_host="auth.openai.com",
            proxy_url="http://runtime.example:8118",
            cookies={"cf_clearance": "flare-token"},
            user_agent="Flare UA",
        )
        fake_proxy = FakeProxySettings(bundle=bundle)
        responses = [
            FakeResponse(
                status_code=403,
                text="<html><title>Just a moment...</title></html>",
                headers={"server": "cloudflare", "content-type": "text/html"},
                url="https://auth.openai.com/api/accounts/authorize",
            ),
            FakeResponse(status_code=200, text="{}", headers={"content-type": "application/json"}),
        ]
        request_calls = []

        def fake_request(session, method, url, retry_attempts=3, **kwargs):
            request_calls.append({"method": method, "url": url, "headers": dict(kwargs.get("headers") or {})})
            return responses.pop(0), ""

        with patch.object(openai_register, "proxy_settings", fake_proxy), patch.object(
            openai_register,
            "create_session",
            return_value=FakeSession(),
        ), patch.object(openai_register, "request_with_local_retry", side_effect=fake_request):
            registrar = openai_register.PlatformRegistrar(proxy="http://legacy-register.example:8080")
            registrar._platform_authorize("user@example.com", 1)

        self.assertEqual(len(request_calls), 2)
        self.assertEqual(len(fake_proxy.refresh_calls), 1)
        retry_headers = {key.lower(): value for key, value in request_calls[1]["headers"].items()}
        self.assertEqual(retry_headers["user-agent"], "Flare UA")
        self.assertEqual(retry_headers["cookie"], "cf_clearance=flare-token")
        self.assertEqual(fake_proxy.refresh_calls[0]["target_url"], openai_register.auth_base)
        self.assertEqual(fake_proxy.refresh_calls[0]["proxy"], "http://legacy-register.example:8080")
        self.assertTrue(fake_proxy.refresh_calls[0]["force"])

    def test_refresh_failure_reports_cloudflare_detail_without_infinite_retry(self):
        fake_proxy = FakeProxySettings(bundle=None)
        cf_response = FakeResponse(
            status_code=403,
            text="<html><title>Just a moment...</title><body>challenge body</body></html>",
            headers={"server": "cloudflare", "content-type": "text/html"},
            url="https://auth.openai.com/api/accounts/authorize",
        )
        request_calls = []

        def fake_request(session, method, url, retry_attempts=3, **kwargs):
            request_calls.append({"method": method, "url": url})
            return cf_response, ""

        with patch.object(openai_register, "proxy_settings", fake_proxy), patch.object(
            openai_register,
            "create_session",
            return_value=FakeSession(),
        ), patch.object(openai_register, "request_with_local_retry", side_effect=fake_request), patch.object(
            openai_register.time,
            "sleep",
        ):
            registrar = openai_register.PlatformRegistrar(proxy="")
            with self.assertRaisesRegex(RuntimeError, "Cloudflare") as ctx:
                registrar._platform_authorize("user@example.com", 1)

        self.assertEqual(len(request_calls), 2)
        self.assertEqual(len(fake_proxy.refresh_calls), 1)
        message = str(ctx.exception)
        self.assertIn("status=403", message)
        self.assertIn("challenge body", message)

    def test_platform_authorize_requests_are_serialized_across_workers(self):
        state_lock = threading.Lock()
        another_request_entered = threading.Event()
        active_requests = 0
        max_active_requests = 0

        def fake_request(_session, _method, _url, **_kwargs):
            nonlocal active_requests, max_active_requests
            with state_lock:
                active_requests += 1
                max_active_requests = max(max_active_requests, active_requests)
                current_active = active_requests
            if current_active == 1:
                another_request_entered.wait(0.2)
            else:
                another_request_entered.set()
            time.sleep(0.02)
            with state_lock:
                active_requests -= 1
            return FakeResponse(
                status_code=200,
                text="<html><title>Create a password - OpenAI</title></html>",
                headers={"content-type": "text/html; charset=utf-8"},
                url="https://auth.openai.com/create-account/password",
            ), ""

        def authorize(index: int) -> None:
            registrar = openai_register.PlatformRegistrar(proxy="")
            try:
                registrar._platform_authorize(f"user-{index}@example.com", index)
            finally:
                registrar.close()

        with patch.object(openai_register, "proxy_settings", FakeProxySettings()), patch.object(
            openai_register,
            "create_session",
            side_effect=lambda _proxy="": FakeSession(),
        ), patch.object(openai_register, "request_with_local_retry", side_effect=fake_request):
            with ThreadPoolExecutor(max_workers=3) as executor:
                list(executor.map(authorize, range(3)))

        self.assertEqual(max_active_requests, 1)


if __name__ == "__main__":
    unittest.main()
