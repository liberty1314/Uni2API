# TempMail.plus 注册邮箱 Provider 设计

## 目标

在注册机现有邮箱 Provider 体系中新增 `tempmail_plus`，依据
`docs/tempmail-plus.md` 调用 TempMail.plus 公共 API 获取验证码。

实现同时支持：

- 注册地址与 TempMail.plus 收件箱相同的直接模式。
- 自有域名地址转发至固定 TempMail.plus 收件箱的转发模式。
- 带 `epin` 的受保护收件箱。
- 从最新新邮件的标题、纯文本或 HTML 中提取 6 位验证码。

## 配置契约

Provider 使用以下配置字段：

```json
{
  "enable": true,
  "type": "tempmail_plus",
  "api_base": "https://tempmail.plus",
  "domain": ["mailto.plus"],
  "mailbox_name": "",
  "inbox_address": "",
  "epin": ""
}
```

- `api_base`：可选，默认为 `https://tempmail.plus`。
- `domain`：必填，注册时使用的域名列表。
- `mailbox_name`：可选。填写时使用固定邮箱前缀；留空时随机生成前缀。
- `inbox_address`：可选。填写后进入转发模式，API 始终读取此固定收件箱。
- `epin`：可选，作为 TempMail.plus API 的 `epin` 查询参数发送。
- 请求超时、等待超时、轮询间隔继续使用邮箱全局配置中的
  `request_timeout`、`wait_timeout` 和 `wait_interval`。

## 地址模式

### 直接模式

当 `inbox_address` 为空时：

1. 从 `domain` 中按现有轮换规则选择一个域名。
2. 优先使用注册流程传入的 `username`。
3. 未传 `username` 时，使用 `mailbox_name`；两者都为空时生成随机前缀。
4. 注册地址与 API 查询地址均为 `{prefix}@{domain}`。

### 转发模式

当 `inbox_address` 非空时：

1. 注册地址仍使用 `domain` 和前缀规则生成。
2. API 查询地址固定为 `inbox_address`。
3. 不按收件人匹配邮件，因为 TempMail.plus 返回的邮件内容不包含可靠的收件人字段。

固定收件箱无法区分多个并发注册任务对应的邮件。实现只保证忽略验证码发送前的旧邮件，并对当前邮箱对象已经消费的消息 ID 去重；不能保证多个线程共享同一收件箱时不串号。填写 `inbox_address`，或在直接模式填写固定 `mailbox_name` 时，界面应提示将注册线程数设置为 `1`。

## 后端组件

在 `services/register/mail_provider.py` 中新增 `TempMailPlusProvider`，保持与现有 `BaseMailProvider` 接口一致。

### `create_mailbox`

- 校验 `domain` 非空。
- 根据地址模式生成注册地址和查询地址。
- 返回 `provider`、`provider_ref`、`address` 和内部使用的 `inbox_address`。
- 不向日志或异常消息写入 `epin`。

### `fetch_latest_message`

1. 请求 `GET {api_base}/api/mails`，参数为 `email` 和可选 `epin`。
2. 校验 HTTP 状态和 JSON 对象结构。
3. 从 `mail_list` 中筛选对象项，按解析后的 `time` 和 `mail_id` 排序取最新一封。
4. 请求 `GET {api_base}/api/mails/{mail_id}`，继续携带相同查询参数。
5. 将详情规范化为现有消息结构：`provider`、`mailbox`、`message_id`、`subject`、`sender`、`text_content`、`html_content`、`received_at` 和 `raw`。
6. 如果列表为空则返回 `None`，由 `BaseMailProvider.wait_for_code` 继续轮询。

验证码提取复用 `_extract_code`，不在 Provider 内重复实现正则。

### 错误处理

- HTTP 非成功状态抛出包含方法、路径、状态码和响应体摘要的 `RuntimeError`。
- 返回值不是 JSON 对象、`mail_list` 不是数组、邮件缺少 `mail_id` 时抛出明确错误。
- 列表为空是正常轮询状态，不作为异常。
- `epin` 不出现在请求失败消息中。
- TempMail.plus 未提供稳定的错误码用于区分错误 `epin`；相关 HTTP 或结构异常将以“收件箱无权访问或接口异常”的语义向上抛出。

## Provider 注册与前端

- 在 `_create_provider` 中注册 `tempmail_plus` 类型。
- 在注册配置下拉框中增加 `tempmail_plus`。
- 新 Provider 的默认字段包括 `api_base`、`domain`、`mailbox_name`、`inbox_address` 和 `epin`。
- 表单显示 API Base、Domain、固定邮箱前缀、固定收件箱和 EPIN 输入框。
- `epin` 使用密码输入框，降低界面旁观泄露风险。
- `inbox_address` 或固定 `mailbox_name` 填写后显示单线程使用提示。

不新增服务端配置迁移。现有 JSON 配置保存机制可直接保留这些字段。

## 测试

新增后端单元测试，使用伪 Session 覆盖：

- 直接模式固定前缀地址生成。
- 直接模式随机或调用方指定前缀地址生成。
- 转发模式注册地址与查询地址分离。
- 列表和详情请求均正确携带 `email` 与 `epin`。
- 多封邮件按 `time`、`mail_id` 选择最新邮件。
- 空列表返回 `None`。
- 标题、纯文本和 HTML 中的验证码均能通过现有提取逻辑读取。
- HTTP 错误、无效 JSON 结构和缺少消息 ID 时抛出明确错误。
- 错误消息不泄露 `epin`。

前端通过 TypeScript/Next.js 构建验证配置字段和条件渲染没有类型或编译错误。

## 验收标准

- 配置下拉框可选择 `tempmail_plus` 并保存全部相关字段。
- `liberty@mailto.plus` 携带正确 `epin` 时可读取最新邮件验证码。
- 自有域名生成的注册地址可以从固定 `inbox_address` 获取验证码。
- 空收件箱持续轮询并在全局等待超时后返回未收到验证码。
- 旧邮件不会因为轮询而被当作本次注册验证码。
- 现有邮箱 Provider 行为和配置保持不变。
