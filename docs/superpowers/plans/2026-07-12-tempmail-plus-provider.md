# TempMail.plus Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为注册机新增 `tempmail_plus` 邮箱类型，支持直接收件箱和自有域名转发到固定收件箱两种模式，并在注册配置界面提供完整字段。

**Architecture:** 在现有 `BaseMailProvider` 接口下增加独立的 `TempMailPlusProvider`，由统一 Provider 工厂创建，继续复用现有轮询、新邮件时间边界、消息去重和验证码提取逻辑。Provider 只负责地址构造、TempMail.plus 列表/详情 API 调用和消息结构规范化；前端沿用通用 JSON 配置保存机制，不增加服务端迁移。

**Tech Stack:** Python 3.13、`curl_cffi.requests`、`unittest`/`pytest`、Next.js 16、React 19、TypeScript、pnpm

---

## File Map

- Create: `test/test_tempmail_plus_provider.py`
  - 用伪 HTTP Session 定义地址模式、API 参数、邮件选择、验证码提取和错误脱敏行为。
- Modify: `services/register/mail_provider.py`
  - 新增 `TempMailPlusProvider`，并在 `_create_provider` 中注册 `tempmail_plus`。
- Modify: `web/src/app/register/components/register-card.tsx`
  - 增加类型选项、默认字段、配置输入框和固定收件箱单线程提示。
- Reference only: `docs/tempmail-plus.md`
  - TempMail.plus API 请求与返回字段依据。
- Reference only: `docs/superpowers/specs/2026-07-12-tempmail-plus-provider-design.md`
  - 已批准的行为与验收标准。

### Task 1: Define Address And API Behavior With Failing Tests

**Files:**
- Create: `test/test_tempmail_plus_provider.py`
- Test: `test/test_tempmail_plus_provider.py`

- [ ] **Step 1: Create reusable fake response and session fixtures**

Add the following test scaffolding:

```python
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
```

- [ ] **Step 2: Write failing tests for direct and forwarding address modes**

Add these tests to `TempMailPlusProviderTests`:

```python
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
```

- [ ] **Step 3: Write a failing test for list/detail requests and latest-message selection**

```python
    def test_fetch_latest_message_uses_inbox_and_epin_and_loads_latest_detail(self) -> None:
        session = FakeSession([
            FakeResponse({
                "mail_list": [
                    {"mail_id": 100, "time": "2026-05-08 07:19:16", "subject": "older"},
                    {"mail_id": 102, "time": "2026-05-08 07:19:17", "subject": "latest"},
                    {"mail_id": 101, "time": "2026-05-08 07:19:17", "subject": "same-time-older-id"},
                ]
            }),
            FakeResponse({
                "subject": "你的 ChatGPT 临时验证码",
                "from_mail": "noreply@tm.openai.com",
                "date": "Fri, 08 May 2026 07:19:17 +0000 (UTC)",
                "text": "验证码 290455",
                "html": "<p>290455</p>",
            }),
        ])
        provider = self.make_provider(session, inbox_address="liberty@mailto.plus", epin="1314")
        mailbox = provider.create_mailbox("outside")

        message = provider.fetch_latest_message(mailbox)

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
```

- [ ] **Step 4: Write failing edge-case tests before production code exists**

Append these tests:

```python
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
```

- [ ] **Step 5: Write failing factory, polling, and extraction-source tests**

```python
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
        session = FakeSession([
            FakeResponse({"mail_list": [{"mail_id": 201, "time": "2026-05-08 07:19:17"}]}),
            FakeResponse({
                "subject": "你的 ChatGPT 临时验证码",
                "date": "Fri, 08 May 2026 07:19:17 +0000 (UTC)",
                "html": "<p>740663</p>",
            }),
        ])
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
```

- [ ] **Step 6: Run the focused tests and verify the expected RED state**

Run:

```bash
uv run pytest test/test_tempmail_plus_provider.py -v
```

Expected: FAIL during test execution because `services.register.mail_provider` has no attribute `TempMailPlusProvider`. Fix test syntax/import errors until this is the only failure reason.

- [ ] **Step 7: Commit the failing behavioral tests**

```bash
git add test/test_tempmail_plus_provider.py
git commit -m "test(register): 定义 tempmail-plus provider 契约"
```

### Task 2: Implement The Provider And Make Core Tests Green

**Files:**
- Modify: `services/register/mail_provider.py:761`
- Modify: `services/register/mail_provider.py:1460`
- Test: `test/test_tempmail_plus_provider.py`

- [ ] **Step 1: Add `TempMailPlusProvider` after `TempMailLolProvider`**

Implement this class, keeping all `epin` handling internal:

```python
class TempMailPlusProvider(BaseMailProvider):
    name = "tempmail_plus"

    def __init__(self, entry: dict, conf: dict):
        super().__init__(conf, str(entry.get("provider_ref") or ""))
        self.api_base = str(entry.get("api_base") or "https://tempmail.plus").strip().rstrip("/") or "https://tempmail.plus"
        self.domain = _normalize_string_list(entry.get("domain"))
        self.mailbox_name = str(entry.get("mailbox_name") or "").strip()
        self.inbox_address = str(entry.get("inbox_address") or "").strip()
        self.epin = str(entry.get("epin") or "").strip()
        self.session = _create_session(conf)
        self.session.headers.update({"User-Agent": conf["user_agent"], "Accept": "application/json"})

    def _masked_body(self, body: str) -> str:
        summary = str(body or "")[:300]
        return summary.replace(self.epin, "***") if self.epin else summary

    def _request(self, path: str, params: dict[str, str]) -> dict[str, Any]:
        response = self.session.request(
            "GET",
            f"{self.api_base}{path}",
            params=params,
            timeout=self.conf["request_timeout"],
            verify=False,
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"TempMail.plus 收件箱无权访问或接口异常: GET {path}, "
                f"HTTP {response.status_code}, body={self._masked_body(response.text)}"
            )
        try:
            data = response.json()
        except Exception as error:
            raise RuntimeError(f"TempMail.plus GET {path} 返回无效 JSON") from error
        if not isinstance(data, dict):
            raise RuntimeError(f"TempMail.plus GET {path} 返回结构不是对象")
        return data

    def create_mailbox(self, username: str | None = None) -> dict[str, Any]:
        domain = _next_domain(self.domain)
        prefix = str(username or self.mailbox_name or _random_mailbox_name()).strip()
        address = f"{prefix}@{domain}"
        return {
            "provider": self.name,
            "provider_ref": self.provider_ref,
            "address": address,
            "inbox_address": self.inbox_address or address,
        }

    @staticmethod
    def _message_sort_key(item: dict[str, Any]) -> tuple[float, int, str]:
        received_at = _parse_received_at(item.get("time") or item.get("date"))
        mail_id = str(item.get("mail_id") or "").strip()
        numeric_id = int(mail_id) if mail_id.isdigit() else 0
        timestamp = received_at.timestamp() if received_at else 0.0
        return timestamp, numeric_id, mail_id

    def fetch_latest_message(self, mailbox: dict[str, Any]) -> dict[str, Any] | None:
        inbox_address = str(mailbox.get("inbox_address") or mailbox.get("address") or "").strip()
        if not inbox_address:
            raise RuntimeError("TempMail.plus 缺少收件箱地址")
        params = {"email": inbox_address}
        if self.epin:
            params["epin"] = self.epin
        listing = self._request("/api/mails", params)
        items = listing.get("mail_list")
        if not isinstance(items, list):
            raise RuntimeError("TempMail.plus mail_list 返回结构不是数组")
        messages = [item for item in items if isinstance(item, dict)]
        if not messages:
            return None
        summary = max(messages, key=self._message_sort_key)
        message_id = str(summary.get("mail_id") or "").strip()
        if not message_id:
            raise RuntimeError("TempMail.plus 最新邮件缺少 mail_id")
        detail = self._request(f"/api/mails/{message_id}", params)
        text_content, html_content = _extract_content(detail)
        sender = detail.get("from_mail") or detail.get("from") or summary.get("from_mail") or ""
        return {
            "provider": self.name,
            "mailbox": inbox_address,
            "message_id": message_id,
            "subject": str(detail.get("subject") or summary.get("subject") or ""),
            "sender": str(sender),
            "text_content": text_content,
            "html_content": html_content,
            "received_at": _parse_received_at(detail.get("date") or detail.get("time") or summary.get("time")),
            "raw": detail,
        }

    def close(self) -> None:
        self.session.close()
```

- [ ] **Step 2: Register the provider in `_create_provider`**

Add this branch immediately after `tempmail_lol`:

```python
    if entry["type"] == "tempmail_plus":
        return TempMailPlusProvider(entry, conf)
```

- [ ] **Step 3: Run the focused tests and verify GREEN**

Run:

```bash
uv run pytest test/test_tempmail_plus_provider.py -v
```

Expected: all address and list/detail tests PASS.

- [ ] **Step 4: Commit the minimal provider implementation**

```bash
git add services/register/mail_provider.py
git commit -m "feat(register): 接入 tempmail-plus 邮箱 provider"
```

### Task 3: Run Core Regression Tests

**Files:**
- Verify: `services/register/mail_provider.py`
- Verify: `test/test_tempmail_plus_provider.py`

- [ ] **Step 1: Run focused and register regression tests**

```bash
uv run pytest test/test_tempmail_plus_provider.py test/test_register_api.py test/test_register_proxy_runtime.py -v
```

Expected: all selected tests PASS.

### Task 4: Add The Registration UI Configuration

**Files:**
- Modify: `web/src/app/register/components/register-card.tsx:48-62`
- Modify: `web/src/app/register/components/register-card.tsx:188-201`
- Modify: `web/src/app/register/components/register-card.tsx:201-347`

- [ ] **Step 1: Add provider defaults and select option**

In `updateProviderType`, add:

```tsx
      ...(type === "tempmail_plus" ? {
        api_base: "https://tempmail.plus",
        domain: [],
        mailbox_name: "",
        inbox_address: "",
        epin: "",
      } : {}),
```

In the provider `SelectContent`, add immediately after `tempmail_lol`:

```tsx
<SelectItem value="tempmail_plus">tempmail_plus</SelectItem>
```

- [ ] **Step 2: Include TempMail.plus in shared API Base and Domain controls**

Extend the API Base condition to include `type === "tempmail_plus"`:

```tsx
{type === "cloudmail_gen" || type === "cloudflare_temp_email" || type === "tempmail_plus" || type === "moemail" || type === "inbucket" || type === "yyds_mail" || type === "ddg_mail" ? (
```

Extend the Domain condition in the same way:

```tsx
{type === "cloudmail_gen" || type === "tempmail_lol" || type === "tempmail_plus" || type === "cloudflare_temp_email" || type === "moemail" || type === "inbucket" || type === "yyds_mail" || type === "ddg_mail" ? (
```

Use `https://tempmail.plus` as the API Base placeholder when `type === "tempmail_plus"`.

- [ ] **Step 3: Add TempMail.plus-specific fields and warning**

Place this block inside the provider form after the shared API fields:

```tsx
{type === "tempmail_plus" ? (
  <>
    <div className="space-y-2">
      <label className="text-sm text-stone-700">固定邮箱前缀</label>
      <Input
        value={String(provider.mailbox_name || "")}
        onChange={(event) => updateProvider(index, { mailbox_name: event.target.value })}
        placeholder="留空则随机生成"
        className="h-10 rounded-xl border-stone-200 bg-white"
        disabled={config.enabled}
      />
    </div>
    <div className="space-y-2">
      <label className="text-sm text-stone-700">固定收件箱</label>
      <Input
        value={String(provider.inbox_address || "")}
        onChange={(event) => updateProvider(index, { inbox_address: event.target.value })}
        placeholder="例如 liberty@mailto.plus；留空则读取注册地址"
        className="h-10 rounded-xl border-stone-200 bg-white"
        disabled={config.enabled}
      />
    </div>
    <div className="space-y-2">
      <label className="text-sm text-stone-700">EPIN</label>
      <Input
        type="password"
        value={String(provider.epin || "")}
        onChange={(event) => updateProvider(index, { epin: event.target.value })}
        placeholder="受保护收件箱填写"
        className="h-10 rounded-xl border-stone-200 bg-white"
        disabled={config.enabled}
      />
    </div>
    {String(provider.inbox_address || "").trim() || String(provider.mailbox_name || "").trim() ? (
      <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 md:col-span-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>固定收件箱无法区分并发注册邮件，请将注册线程数设置为 1。</span>
      </div>
    ) : null}
  </>
) : null}
```

- [ ] **Step 4: Run frontend formatting/type/build verification**

Run:

```bash
pnpm --dir web build
```

Expected: Next.js build exits with code `0` without TypeScript errors.

- [ ] **Step 5: Commit the UI integration**

```bash
git add web/src/app/register/components/register-card.tsx
git commit -m "feat(register): 增加 tempmail-plus 配置界面"
```

### Task 5: Full Verification And Requirement Audit

**Files:**
- Verify: `services/register/mail_provider.py`
- Verify: `test/test_tempmail_plus_provider.py`
- Verify: `web/src/app/register/components/register-card.tsx`

- [ ] **Step 1: Run the full Python test suite**

```bash
uv run pytest test -q
```

Expected: exit code `0`, no failed tests.

- [ ] **Step 2: Run the production frontend build again from a clean command**

```bash
pnpm --dir web build
```

Expected: exit code `0`, Next.js reports a successful production build.

- [ ] **Step 3: Run static diff checks**

```bash
git diff --check
git status --short
```

Expected: `git diff --check` has no output. `git status --short` may still show the user-owned untracked `docs/tempmail-plus.md`, but no uncommitted implementation files.

- [ ] **Step 4: Audit every acceptance criterion**

Confirm from tests and code:

- `tempmail_plus` appears in `_create_provider` and the frontend select.
- Direct mode reads the generated registration address.
- Forwarding mode reads `inbox_address` without recipient matching.
- `epin` is sent to list and detail endpoints and masked in errors.
- Latest selection uses `time`, then `mail_id`.
- Empty inbox returns `None` so the existing global timeout applies.
- Existing `_code_not_before`, message-ID tracking, and `_extract_code` are reused.
- UI exposes `api_base`, `domain`, `mailbox_name`, `inbox_address`, and password-style `epin`.
- Fixed inbox/prefix configurations display the single-thread warning.

- [ ] **Step 5: Record final implementation commit if verification required a correction**

Only if Task 5 found and fixed an issue:

```bash
git add services/register/mail_provider.py test/test_tempmail_plus_provider.py web/src/app/register/components/register-card.tsx
git commit -m "fix(register): 完善 tempmail-plus 接入验证"
```

Do not commit `docs/tempmail-plus.md` unless the user explicitly requests it.
