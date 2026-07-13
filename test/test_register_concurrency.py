from __future__ import annotations

import tempfile
import unittest
from concurrent.futures import Future
from pathlib import Path
from unittest import mock

import services.register_service as register_service_module


class RecordingExecutor:
    max_workers: int | None = None

    def __init__(self, max_workers: int) -> None:
        type(self).max_workers = max_workers

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _traceback) -> None:
        return None

    def submit(self, _function, *_args, **_kwargs):
        future = Future()
        future.set_result({"ok": True})
        return future


class RegisterConcurrencyTests(unittest.TestCase):
    def test_effective_threads_limits_fixed_tempmail_plus_inboxes(self) -> None:
        cases = [
            ({"inbox_address": "liberty@mailto.plus", "mailbox_name": ""}, 1),
            ({"inbox_address": "", "mailbox_name": "liberty"}, 1),
            ({"inbox_address": "", "mailbox_name": ""}, 3),
        ]

        for provider_fields, expected in cases:
            with self.subTest(provider_fields=provider_fields):
                config = {
                    "threads": 3,
                    "mail": {
                        "providers": [
                            {
                                "enable": True,
                                "type": "tempmail_plus",
                                **provider_fields,
                            }
                        ]
                    },
                }
                self.assertEqual(register_service_module._effective_register_threads(config), expected)

    def test_run_uses_effective_thread_limit_for_fixed_tempmail_plus_inbox(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            service = register_service_module.RegisterService(Path(tmp_dir) / "register.json")
            service.update(
                {
                    "total": 1,
                    "threads": 3,
                    "mail": {
                        "providers": [
                            {
                                "enable": True,
                                "type": "tempmail_plus",
                                "domain": ["qwe.pics"],
                                "inbox_address": "liberty@mailto.plus",
                                "mailbox_name": "",
                            }
                        ]
                    },
                }
            )
            service._config["enabled"] = True
            RecordingExecutor.max_workers = None

            with mock.patch.object(register_service_module, "ThreadPoolExecutor", RecordingExecutor), mock.patch.object(
                service,
                "_pool_metrics",
                return_value={"current_quota": 0, "current_available": 0},
            ):
                service._run()

        self.assertEqual(RecordingExecutor.max_workers, 1)

    def test_run_stops_after_registration_disallowed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            service = register_service_module.RegisterService(Path(tmp_dir) / "register.json")
            service.update(
                {
                    "total": 3,
                    "threads": 1,
                    "mail": {
                        "providers": [
                            {
                                "enable": True,
                                "type": "tempmail_plus",
                                "domain": ["qwe.pics"],
                                "inbox_address": "liberty@mailto.plus",
                                "mailbox_name": "",
                            }
                        ]
                    },
                }
            )
            service._config["enabled"] = True

            with mock.patch.object(
                register_service_module.openai_register,
                "worker",
                return_value={
                    "ok": False,
                    "error": "平台拒绝当前自动注册状态（registration_disallowed），请检查注册流程和资料是否符合平台规则",
                },
            ) as worker_mock, mock.patch.object(
                service,
                "_pool_metrics",
                return_value={"current_quota": 0, "current_available": 0},
            ):
                service._run()

            snapshot = service.get()

        self.assertEqual(worker_mock.call_count, 1)
        self.assertFalse(snapshot["enabled"])
        self.assertEqual(snapshot["stats"]["done"], 1)
        self.assertEqual(snapshot["stats"]["fail"], 1)
        self.assertTrue(any("已停止后续注册" in item["text"] for item in snapshot["logs"]))


if __name__ == "__main__":
    unittest.main()
