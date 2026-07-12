# TempMail.plus 验证码获取需求文档

## 1. 目标

在其他项目中复刻 `tempmail.plus` 临时邮箱验证码读取能力，支持：

- 固定邮箱模式
- 受 `EPIN` 保护的收件箱
- 拉取最新邮件
- 从邮件标题、纯文本、HTML 中提取 6 位验证码

本文档基于已验证可用的公开站点行为整理，适合作为产品需求和技术实现说明。

## 2. 适用场景

- 自动注册流程中的邮箱验证码读取
- 邮箱登录验证码轮询
- ChatGPT / OpenAI / 其他平台的 6 位验证码识别

## 3. 前置条件

调用方需要提供以下配置：

- `domain`
  - 必填
  - 邮箱域名，例如 `mailto.plus`
- `mailbox_name`
  - 可选
  - 固定邮箱前缀，例如 `liberty`
- `epin`
  - 可选
  - 如果收件箱受保护，则必须提供

当三者组合为：

- `domain = mailto.plus`
- `mailbox_name = liberty`
- `epin = 1314`

目标邮箱即为：

`liberty@mailto.plus`

## 4. 业务规则

### 4.1 邮箱生成规则

系统支持两种模式：

1. 固定邮箱模式
   - 如果传入 `mailbox_name`
   - 邮箱地址拼接为：`{mailbox_name}@{domain}`

2. 随机邮箱模式
   - 如果未传入 `mailbox_name`
   - 系统随机生成前缀，再拼接成邮箱地址

### 4.2 收件箱保护规则

- `tempmail.plus` 受保护收件箱使用的参数名是 `epin`
- 不是 `pin`
- 若收件箱设置了保护码但未传 `epin`，接口可能无法返回可读邮件列表

## 5. 接口需求

## 5.1 查询邮件列表

### 请求

- 方法：`GET`
- URL：`https://tempmail.plus/api/mails`
- Query 参数：
  - `email`: 完整邮箱地址
  - `epin`: 收件箱保护码，可选

### 示例

```http
GET /api/mails?email=liberty@mailto.plus&epin=1314 HTTP/1.1
Host: tempmail.plus
Accept: application/json
```

### 期望返回

返回 JSON 对象，核心字段如下：

- `mail_list`
  - 类型：数组
  - 每项通常包含：
    - `mail_id`
    - `from_mail`
    - `subject`
    - `time`

### 示例结构

```json
{
  "mail_list": [
    {
      "mail_id": 373576905,
      "from_mail": "noreply@tm.openai.com",
      "subject": "你的 ChatGPT 临时验证码",
      "time": "2026-05-08 07:19:17"
    }
  ]
}
```

## 5.2 查询单封邮件详情

### 请求

- 方法：`GET`
- URL：`https://tempmail.plus/api/mails/{mail_id}`
- Query 参数：
  - `email`: 完整邮箱地址
  - `epin`: 收件箱保护码，可选

### 示例

```http
GET /api/mails/373576905?email=liberty@mailto.plus&epin=1314 HTTP/1.1
Host: tempmail.plus
Accept: application/json
```

### 期望返回

返回 JSON 对象，核心字段如下：

- `subject`
- `from`
- `from_mail`
- `date`
- `text`
- `html`

### 示例结构

```json
{
  "subject": "你的 ChatGPT 临时验证码",
  "from": "noreply@tm.openai.com",
  "from_mail": "noreply@tm.openai.com",
  "date": "Fri, 08 May 2026 07:19:07 +0000 (UTC)",
  "html": "<p>740663</p>",
  "text": "你的 ChatGPT 临时验证码 740663"
}
```

## 6. 邮件读取流程

### 6.1 主流程

1. 组装邮箱地址
2. 调用“邮件列表接口”
3. 若 `mail_list` 为空，进入轮询等待
4. 若存在多封邮件，按最新时间选择最新一封
5. 使用该邮件的 `mail_id` 调用“邮件详情接口”
6. 从详情中提取验证码
7. 返回验证码和原始邮件信息

### 6.2 最新邮件判定规则

建议排序依据：

1. 优先按 `time` / `date` 转时间戳排序
2. 如果时间相同，再按 `mail_id` 排序
3. 取最大值作为最新邮件

## 7. 验证码提取规则

验证码提取来源按以下优先级处理：

1. `text`
2. `html`
3. `subject`

建议提取规则：

- 优先提取 6 位数字验证码
- 正则示例：

```regex
\b(\d{6})\b
```

### 兼容要求

以下内容都应能提取出验证码：

- `你的 ChatGPT 临时验证码 740663`
- `你的 OpenAI 代码为 956778`
- HTML 片段中的 `<p>740663</p>`

## 8. 轮询需求

### 8.1 默认参数

- `request_timeout`: 30 秒
- `wait_timeout`: 30 秒
- `wait_interval`: 2 秒

### 8.2 轮询逻辑

在等待验证码时：

1. 每隔 `wait_interval` 秒查询一次邮件列表
2. 累计等待不超过 `wait_timeout`
3. 超时后返回“未收到验证码”

## 9. 异常处理

以下情况必须明确处理：

### 9.1 邮件列表为空

- 返回“暂无邮件”
- 轮询场景继续等待

### 9.2 接口 HTTP 非 200

- 记录 URL、状态码、响应体摘要
- 视为临时失败

### 9.3 返回结构不符合预期

- 例如不是 JSON 对象
- 记录错误并中断当前读取

### 9.4 邮件详情缺失正文

- 允许继续从 `subject` 提取验证码

### 9.5 `epin` 错误

- 可能导致读取不到邮件或接口异常
- 需要向上层暴露“收件箱保护码错误或无权限访问”

## 10. 安全与限制

- `epin` 属于敏感信息，不应明文打印到公开日志
- 建议日志中只显示掩码值，例如 `13**`
- `tempmail.plus` 当前使用的是公开站点行为，不保证长期稳定
- 建议将域名、接口根地址、超时、轮询间隔做成可配置项

## 11. 验收标准

实现完成后，至少满足以下验收项：

1. 可读取固定邮箱 `liberty@mailto.plus`
2. 可携带 `epin=1314` 成功查询收件箱
3. 可获取最新一封邮件详情
4. 可从标题、文本、HTML 中提取 6 位验证码
5. 对空列表、接口异常、超时有明确返回

## 12. 已验证样例

本方案已验证以下样例可成功提取验证码：

- 邮件主题：`你的 ChatGPT 临时验证码`
  - 提取结果：`740663`
- 邮件主题：`你的 OpenAI 代码为 956778`
  - 提取结果：`956778`

## 13. 推荐数据结构

```json
{
  "type": "tempmail_plus",
  "domain": ["mailto.plus"],
  "mailbox_name": "liberty",
  "epin": "1314",
  "request_timeout": 30,
  "wait_timeout": 30,
  "wait_interval": 2
}
```

如果你是自有域名转发到 `tempmail.plus` 收件箱，例如：

- 对外注册邮箱域名：`qwe.pics`
- 实际收件箱：`liberty@mailto.plus`
- `epin = 1314`

建议使用下面这组配置：

```json
{
  "type": "tempmail_plus",
  "domain": ["qwe.pics"],
  "inbox_address": "liberty@mailto.plus",
  "epin": "1314",
  "request_timeout": 30,
  "wait_timeout": 30,
  "wait_interval": 2
}
```

说明：

- `domain` 是对外注册时实际使用的邮箱域名
- `inbox_address` 是 `tempmail.plus` API 轮询读取的真实收件箱
- 若 `mailbox_name` 留空，系统可随机生成前缀，例如 `abc123@qwe.pics`
- 若多个对外地址共用同一个 `inbox_address`，实现层需要尽量按邮件接收人匹配当前注册邮箱

## 14. 推荐返回结构

```json
{
  "provider": "tempmail_plus",
  "address": "liberty@mailto.plus",
  "message_id": "373576905",
  "subject": "你的 ChatGPT 临时验证码",
  "sender": "noreply@tm.openai.com",
  "text_content": "你的 ChatGPT 临时验证码 740663",
  "html_content": "<p>740663</p>",
  "code": "740663",
  "received_at": "2026-05-08T07:19:07+00:00"
}
```
