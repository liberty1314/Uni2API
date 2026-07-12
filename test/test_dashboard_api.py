from __future__ import annotations

import unittest
from unittest import mock

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import api.dashboard as dashboard_module


ADMIN = {"id": "admin-1", "name": "管理员", "role": "admin"}
USER = {"id": "user-1", "name": "普通用户", "role": "user"}


class FakeAccountService:
    def __init__(self, active: int = 2) -> None:
        self.active = active
        self.calls = 0

    def account_health(self) -> dict[str, object]:
        self.calls += 1
        return {
            "healthy": self.active > 0,
            "status": "ok" if self.active > 0 else "degraded",
            "total": 3,
            "active": self.active,
            "limited": 1,
            "abnormal": 0,
            "disabled": 0,
            "total_quota": 18,
        }


class FakeImageTaskService:
    def __init__(self) -> None:
        self.calls: list[tuple[dict[str, object], bool]] = []

    def dashboard_summary(self, identity: dict[str, object], *, include_all: bool) -> dict[str, object]:
        self.calls.append((identity, include_all))
        return {
            "queued": 1,
            "running": 1,
            "success": 3,
            "error": 1,
            "unfinished": 2,
            "recent": [
                {
                    "id": "task-1",
                    "status": "success",
                    "mode": "generate",
                    "model": "gpt-image-2",
                    "created_at": "2026-07-12 08:00:00",
                    "updated_at": "2026-07-12 08:00:10",
                    "image_url": "https://example.test/work.png",
                }
            ],
            "recent_images": [
                {
                    "task_id": "task-1",
                    "url": "https://example.test/work.png",
                    "created_at": "2026-07-12 08:00:10",
                }
            ],
            "models": ["gpt-image-2"],
        }


class FakeLogService:
    def __init__(self, calls: int = 12, failed: int = 3) -> None:
        self.calls = calls
        self.failed = failed

    def call_stats_since(self, _since, *, max_lines: int = 5000) -> dict[str, object]:
        self.max_lines = max_lines
        return {
            "total": self.calls,
            "success": self.calls - self.failed,
            "failed": self.failed,
            "success_rate": (self.calls - self.failed) / self.calls if self.calls else None,
        }


class FakeProxySettings:
    def get_runtime_status(self) -> dict[str, object]:
        return {
            "enabled": True,
            "egress_mode": "single_proxy",
            "proxy_source": "proxy_runtime",
            "has_proxy": True,
            "clearance_enabled": False,
            "clearance_mode": "none",
            "has_clearance_bundle": False,
            "cached_clearance_hosts": [],
        }


class DashboardApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.accounts = FakeAccountService()
        self.tasks = FakeImageTaskService()
        self.logs = FakeLogService()

        def fake_identity(authorization: str | None) -> dict[str, object]:
            if authorization == "Bearer admin-key":
                return ADMIN
            if authorization == "Bearer user-key":
                return USER
            raise HTTPException(status_code=401, detail={"error": "invalid key"})

        self.patchers = [
            mock.patch.object(dashboard_module, "require_identity", fake_identity),
            mock.patch.object(dashboard_module, "account_service", self.accounts),
            mock.patch.object(dashboard_module, "image_task_service", self.tasks),
            mock.patch.object(dashboard_module, "log_service", self.logs),
            mock.patch.object(dashboard_module, "proxy_settings", FakeProxySettings()),
        ]
        for patcher in self.patchers:
            patcher.start()
            self.addCleanup(patcher.stop)

        app = FastAPI()
        app.include_router(dashboard_module.create_router())
        self.client = TestClient(app)

    def test_admin_receives_operational_summary(self) -> None:
        response = self.client.get("/api/dashboard/summary", headers={"Authorization": "Bearer admin-key"})

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["severity"], "warning")
        self.assertEqual(payload["primary_action"]["id"], "create")
        self.assertEqual(payload["accounts"]["active"], 2)
        self.assertEqual(payload["calls"]["total"], 12)
        self.assertEqual(payload["tasks"]["unfinished"], 2)
        self.assertEqual(payload["recent_images"][0]["url"], "https://example.test/work.png")
        self.assertEqual(self.tasks.calls, [(ADMIN, True)])

    def test_user_response_excludes_admin_only_fields(self) -> None:
        response = self.client.get("/api/dashboard/summary", headers={"Authorization": "Bearer user-key"})

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["role"], "user")
        self.assertEqual(payload["tasks"]["unfinished"], 2)
        self.assertEqual(payload["available_models"], ["gpt-image-2"])
        self.assertNotIn("accounts", payload)
        self.assertNotIn("calls", payload)
        self.assertNotIn("proxy", payload)
        self.assertNotIn("recent_images", payload)
        self.assertEqual(self.tasks.calls, [(USER, False)])
        self.assertEqual(self.accounts.calls, 0)

    def test_no_calls_returns_explicit_no_data_rate(self) -> None:
        self.logs.calls = 0
        self.logs.failed = 0

        response = self.client.get("/api/dashboard/summary", headers={"Authorization": "Bearer admin-key"})

        self.assertEqual(response.status_code, 200, response.text)
        calls = response.json()["calls"]
        self.assertEqual(calls["total"], 0)
        self.assertIsNone(calls["success_rate"])

    def test_blocking_account_state_switches_primary_action(self) -> None:
        self.accounts.active = 0

        response = self.client.get("/api/dashboard/summary", headers={"Authorization": "Bearer admin-key"})

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["severity"], "critical")
        self.assertEqual(payload["primary_action"]["id"], "diagnose")
        self.assertTrue(payload["primary_action"]["blocked"])
        self.assertTrue(any(alert["code"] == "no-active-accounts" for alert in payload["alerts"]))

    def test_unauthorized_request_is_rejected(self) -> None:
        response = self.client.get("/api/dashboard/summary")

        self.assertEqual(response.status_code, 401, response.text)


if __name__ == "__main__":
    unittest.main()
