## Why

当前前端以横向导航和独立功能页为主，随着图像创作、账户池、日志、设置与调试能力增长，用户难以在同一入口确认服务健康并发起创作。现有视觉语言也未能建立统一层级，导致管理密度、主题体验和移动端行为不一致。

现在已有经确认的 Uni2API 产品定位、视觉方案与管理员工作台草图，应将其转化为可逐项实施和验收的前端变更契约。

## What Changes

- 以 `Uni2API` 统一应用内品牌，新增面向桌面、平板和手机的角色感知应用壳层与分组侧栏导航。
- 新增管理员与普通用户的角色自适应工作台；管理员首页同时展示系统健康和快速创作，普通用户优先展示创作状态与最近作品。
- 新增 Soft UI 设计 tokens、浅色/深色主题和组件状态规范，采用云雾蓝、钴蓝与珊瑚配色，以及平衡型圆角、双向外阴影与局部内阴影。
- 改造图像创作、图片库、账户池、运行日志、设置、调试和登录页面，使其接入统一的应用壳层与任务导向交互。
- 新增首页快捷创作、系统状态自适应主操作、全局命令面板、响应式降级和无障碍验收要求。
- 保留所有现有路由与后端 API 契约；不改变认证、账户、图像任务、日志或设置的业务语义。

## Capabilities

### New Capabilities

- `console-app-shell`: 提供 Uni2API 品牌、角色可见性、分组侧栏、全局工具区和稳定的跨路由导航状态。
- `role-adaptive-workspace`: 提供管理员和普通用户的角色自适应首页、运行状态模型和状态自适应主操作。
- `soft-ui-design-system`: 提供云雾蓝 Soft UI tokens、浅深主题、组件状态和数据密集场景的视觉约束。
- `image-creation-workflow`: 提供首页快捷创作与完整创作页之间的草稿、任务和高级编辑承接。
- `operations-management-workflows`: 提供账户池、运行日志、图片库、设置和实验室的统一管理工作流。
- `responsive-accessible-console`: 提供断点布局、移动端功能降级、键盘导航、状态通告与动效降级要求。

### Modified Capabilities

无。当前 `openspec/specs/` 中没有已发布规格。

## Impact

- 前端应用壳层、导航、主题和基础 UI 组件：`web/src/app/layout.tsx`、`web/src/app/globals.css`、`web/src/components/`、`web/src/components/ui/`。
- 页面与工作流：`web/src/app/page.tsx`、`login`、`image`、`image-manager`、`accounts`、`logs`、`settings`、`debug`。
- 客户端状态与请求层：`web/src/store/`、`web/src/lib/`，仅在首页聚合数据、草稿传递和导航状态需要时扩展。
- 现有 shadcn/Radix 和 Lucide 基础继续使用；实施前按候选匹配度评估 21st.dev 的 Sidebar、Table、Upload、Tabs、Dialog、Empty state 结构，避免为视觉效果引入高维护依赖。
- 不涉及后端 API、数据库、认证模型或外部部署协议的破坏性变更。
