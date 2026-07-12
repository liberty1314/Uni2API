from __future__ import annotations

import unittest
from datetime import datetime, timezone
from unittest import mock

from services.register import mail_provider


class FakeResponse:
    def __init__(self, payload, status_code: int = 200, text: str = "") -> None:
        self.payload = payload
        self.status_code = status_code
        self.text = text

    def json(self):
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


class FakeSession:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = list(responses)
        self.calls: list[dict] = []
        self.headers: dict[str, str] = {}
        self.closed = False

    def request(self, method: str, url: str, **kwargs):
        self.calls.append({"method": method, "url": url, **kwargs})
        return self.responses.pop(0)

    def close(self) -> None:
        self.closed = True


def provider_entry(**overrides):
    return {
        "type": "tempmail_plus",
        "provider_ref": "tempmail_plus#1",
        "api_base": "https://tempmail.plus",
        "domain": ["mailto.plus"],
        "mailbox_name": "",
        "inbox_address": "",
        "epin": "",
        **overrides,
    }


def provider_conf():
    return {
        "request_timeout": 30,
        "wait_timeout": 0.01,
        "wait_interval": 0.2,
        "user_agent": "test-agent",
        "proxy": "",
    }


class TempMailPlusProviderTests(unittest.TestCase):
    def make_provider(self, session: FakeSession, **entry_overrides):
        with mock.patch.object(mail_provider, "_create_session", return_value=session):
            return mail_provider.TempMailPlusProvider(provider_entry(**entry_overrides), provider_conf())

    def test_direct_mode_uses_username_before_fixed_mailbox_name(self) -> None:
        provider = self.make_provider(FakeSession([]), mailbox_name="liberty")

        mailbox = provider.create_mailbox("requested")

        self.assertEqual(mailbox["address"], "requested@mailto.plus")
        self.assertEqual(mailbox["inbox_address"], "requested@mailto.plus")

    def test_direct_mode_uses_fixed_mailbox_name_without_username(self) -> None:
        provider = self.make_provider(FakeSession([]), mailbox_name="liberty")

        mailbox = provider.create_mailbox()

        self.assertEqual(mailbox["address"], "liberty@mailto.plus")
        self.assertEqual(mailbox["inbox_address"], "liberty@mailto.plus")

    def test_direct_mode_generates_random_prefix_when_no_prefix_is_configured(self) -> None:
        provider = self.make_provider(FakeSession([]))

        with mock.patch.object(mail_provider, "_random_mailbox_name", return_value="abc123"):
            mailbox = provider.create_mailbox()

        self.assertEqual(mailbox["address"], "abc123@mailto.plus")
        self.assertEqual(mailbox["inbox_address"], "abc123@mailto.plus")

    def test_forwarding_mode_separates_registration_and_inbox_addresses(self) -> None:
        provider = self.make_provider(
            FakeSession([]),
            domain=["qwe.pics"],
            inbox_address="liberty@mailto.plus",
            epin="1314",
        )

        mailbox = provider.create_mailbox("outside")

        self.assertEqual(mailbox["address"], "outside@qwe.pics")
        self.assertEqual(mailbox["inbox_address"], "liberty@mailto.plus")

    def test_fetch_latest_message_uses_inbox_and_epin_and_loads_latest_detail(self) -> None:
        session = FakeSession(
            [
                FakeResponse(
                    {
                        "mail_list": [
                            {"mail_id": 100, "time": "2026-05-08 07:19:16", "subject": "older"},
                            {"mail_id": 102, "time": "2026-05-08 07:19:17", "subject": "latest"},
                            {"mail_id": 101, "time": "2026-05-08 07:19:17", "subject": "same-time-older-id"},
                        ]
                    }
                ),
                FakeResponse(
                    {
                        "subject": "你的 ChatGPT 临时验证码",
                        "from_mail": "noreply@tm.openai.com",
                        "date": "Fri, 08 May 2026 07:19:17 +0000 (UTC)",
                        "text": "验证码 290455",
                        "html": "<p>290455</p>",
                    }
                ),
            ]
        )
        provider = self.make_provider(session, inbox_address="liberty@mailto.plus", epin="1314")
        mailbox = provider.create_mailbox("outside")

        message = provider.fetch_latest_message(mailbox)

        self.assertIsNotNone(message)
        assert message is not None
        self.assertEqual(message["message_id"], "102")
        self.assertEqual(message["mailbox"], "liberty@mailto.plus")
        self.assertEqual(message["sender"], "noreply@tm.openai.com")
        self.assertEqual(message["text_content"], "验证码 290455")
        self.assertEqual(message["html_content"], "<p>290455</p>")
        self.assertEqual(message["received_at"], datetime(2026, 5, 8, 7, 19, 17, tzinfo=timezone.utc))
        self.assertEqual(session.calls[0]["url"], "https://tempmail.plus/api/mails")
        self.assertEqual(session.calls[0]["params"], {"email": "liberty@mailto.plus", "epin": "1314"})
        self.assertEqual(session.calls[1]["url"], "https://tempmail.plus/api/mails/102")
        self.assertEqual(session.calls[1]["params"], {"email": "liberty@mailto.plus", "epin": "1314"})
        self.assertEqual(mail_provider._extract_code(message), "290455")

    def test_empty_mail_list_returns_none(self) -> None:
        provider = self.make_provider(FakeSession([FakeResponse({"mail_list": []})]))

        message = provider.fetch_latest_message(provider.create_mailbox("empty"))

        self.assertIsNone(message)

    def test_missing_mail_id_is_rejected(self) -> None:
        provider = self.make_provider(FakeSession([FakeResponse({"mail_list": [{"time": "2026-05-08 07:19:17"}]})]))

        with self.assertRaisesRegex(RuntimeError, "缺少 mail_id"):
            provider.fetch_latest_message(provider.create_mailbox("missing"))

    def test_http_error_does_not_expose_epin(self) -> None:
        provider = self.make_provider(
            FakeSession([FakeResponse({}, status_code=403, text="invalid epin 1314")]),
            epin="1314",
        )

        with self.assertRaises(RuntimeError) as context:
            provider.fetch_latest_message(provider.create_mailbox("private"))

        self.assertIn("HTTP 403", str(context.exception))
        self.assertNotIn("1314", str(context.exception))

    def test_non_object_json_is_rejected(self) -> None:
        provider = self.make_provider(FakeSession([FakeResponse([])]))

        with self.assertRaisesRegex(RuntimeError, "返回结构不是对象"):
            provider.fetch_latest_message(provider.create_mailbox("invalid"))

    def test_invalid_json_is_rejected(self) -> None:
        provider = self.make_provider(FakeSession([FakeResponse(ValueError("bad json"))]))

        with self.assertRaisesRegex(RuntimeError, "返回无效 JSON"):
            provider.fetch_latest_message(provider.create_mailbox("invalid"))

    def test_provider_factory_creates_tempmail_plus(self) -> None:
        config = {
            "request_timeout": 30,
            "wait_timeout": 30,
            "wait_interval": 2,
            "providers": [{"enable": True, **provider_entry()}],
        }
        session = FakeSession([])

        with mock.patch.object(mail_provider, "_create_session", return_value=session):
            provider = mail_provider._create_provider(config)

        self.assertIsInstance(provider, mail_provider.TempMailPlusProvider)
        provider.close()
        self.assertTrue(session.closed)

    def test_wait_for_code_extracts_html_code_from_new_message(self) -> None:
        session = FakeSession(
            [
                FakeResponse({"mail_list": [{"mail_id": 201, "time": "2026-05-08 07:19:17"}]}),
                FakeResponse(
                    {
                        "subject": "你的 ChatGPT 临时验证码",
                        "date": "Fri, 08 May 2026 07:19:17 +0000 (UTC)",
                        "html": "<p>740663</p>",
                    }
                ),
            ]
        )
        provider = self.make_provider(session)
        mailbox = provider.create_mailbox("verify")
        mailbox["_code_not_before"] = datetime(2026, 5, 8, 7, 19, 16, tzinfo=timezone.utc)

        code = provider.wait_for_code(mailbox)

        self.assertEqual(code, "740663")

    def test_shared_extractor_supports_subject_text_and_html(self) -> None:
        cases = [
            ({"subject": "你的 OpenAI 代码为 956778"}, "956778"),
            ({"text_content": "你的 ChatGPT 临时验证码 740663"}, "740663"),
            ({"html_content": "<p>290455</p>"}, "290455"),
        ]

        for message, expected in cases:
            with self.subTest(message=message):
                self.assertEqual(mail_provider._extract_code(message), expected)


if __name__ == "__main__":
    unittest.main()
