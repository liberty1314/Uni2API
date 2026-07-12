from __future__ import annotations

import unittest
from unittest import mock

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import api.register as register_module


class FakeRegisterService:
    def __init__(self) -> None:
        self.config = {
            "enabled": False,
            "mail": {"providers": []},
            "proxy": "",
            "total": 10,
            "threads": 3,
            "mode": "total",
            "target_quota": 100,
            "target_available": 10,
            "check_interval": 5,
            "stats": {"success": 0, "fail": 0, "done": 0, "running": 0, "threads": 3},
        }

    def get(self) -> dict:
        return self.config

    def update(self, updates: dict) -> dict:
        self.config = {**self.config, **updates}
        return self.config


class RegisterApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = FakeRegisterService()

        def fake_admin(authorization: str | None) -> dict[str, object]:
            if authorization == "Bearer admin-key":
                return {"id": "admin", "name": "管理员", "role": "admin"}
            if authorization == "Bearer user-key":
                raise HTTPException(status_code=403, detail={"error": "需要管理员权限"})
            raise HTTPException(status_code=401, detail={"error": "密钥无效"})

        patchers = [
            mock.patch.object(register_module, "require_admin", fake_admin),
            mock.patch.object(register_module, "register_service", self.service),
        ]
        for patcher in patchers:
            patcher.start()
            self.addCleanup(patcher.stop)

        app = FastAPI()
        app.include_router(register_module.create_router())
        self.client = TestClient(app)

    def test_admin_can_read_register_config(self) -> None:
        response = self.client.get("/api/register", headers={"Authorization": "Bearer admin-key"})

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["register"]["total"], 10)

    def test_admin_can_update_register_config(self) -> None:
        response = self.client.post(
            "/api/register",
            headers={"Authorization": "Bearer admin-key"},
            json={"total": 20, "threads": 4, "mode": "quota"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["register"]["total"], 20)
        self.assertEqual(response.json()["register"]["threads"], 4)
        self.assertEqual(response.json()["register"]["mode"], "quota")

    def test_user_is_rejected(self) -> None:
        response = self.client.get("/api/register", headers={"Authorization": "Bearer user-key"})

        self.assertEqual(response.status_code, 403, response.text)

    def test_unauthorized_request_is_rejected(self) -> None:
        response = self.client.get("/api/register")

        self.assertEqual(response.status_code, 401, response.text)


if __name__ == "__main__":
    unittest.main()
