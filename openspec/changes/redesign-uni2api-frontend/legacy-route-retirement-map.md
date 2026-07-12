# Uni2API 旧前端路由退役映射

> 状态：执行中。根布局、工作台与登录页已进入新实现，其余路由继续按本表迁移；保留 URL 不代表保留旧 JSX、样式或包装组件。

## 1. 全局退役原则

- 先在新实现中保持认证 guard、角色权限、请求函数、客户端状态、URL 和关键交互不变，再删除被替代的视图层代码。
- `TopNav`、`HeaderActions`、`ThemeToggle`、`ThemeScript`、`AnimatedThemeToggler` 只在 `ConsoleShell` 完成管理员、普通用户、移动端和深链验证后删除或迁入新归属。
- `text-3d-flip.tsx`、`morphing-text.tsx`、`dia-text-reveal.tsx` 必须通过全仓导入审计确认无人使用后才删除；不能仅凭文件名或“看起来旧”删除。
- 旧 `chatgpt2api` 存储采用“读旧 -> 写新 -> 确认 -> 删除旧”迁移。上游 GitHub URL、WebDAV 默认路径、兼容 API 示例和调试 Skill 标识属于兼容性例外，不得批量改名。
- 每次删除旧 JSX/CSS/依赖后运行 `pnpm build` 和受影响路由 smoke test；表格和日志页面额外验证批量操作与详情 Sheet/Dialog。

## 2. 路由映射

| 保留 URL | 当前入口与旧实现 | 新模块与目标结构 | 必须保留的行为/数据边界 | 删除旧实现前的门槛 | 计划证据 |
| --- | --- | --- | --- | --- | --- |
| `/` | `web/src/app/page.tsx` 当前只读取认证会话并按 `getDefaultRouteForRole` 跳至 `/accounts` 或 `/image`。 | `DashboardPage` + `useDashboardSummary`，置于 `web/src/app/page.tsx` 与 `web/src/components/console/dashboard-*`。 | 未认证仍去 `/login`；管理员与普通用户均按身份显示；不得在浏览器聚合原始日志。 | `GET /api/dashboard/summary` 的字段级角色测试通过；管理员正常/阻断、普通用户、空数据、加载状态均通过。 | API 测试、四种状态截图、角色导航 smoke test。 |
| `/login` | `web/src/app/login/page.tsx` 使用旧 `HeaderActions`、石色 Card、直接 `getDefaultRouteForRole` 跳转。 | `LoginPage` 使用新 token 化 shadcn Input/Button 与单任务认证布局。 | `useRedirectIfAuthenticated`、`login`、`setStoredAuthSession`、Enter 提交、错误 Toast 必须保留；登录成功进入角色工作台。 | 无壳层登录页、密钥显示/隐藏、粘贴反馈、字段错误和键盘路径完成；认证存储迁移已验证。 | 登录成功/失败/已登录重定向截图与 smoke test。 |
| `/image` | `web/src/app/image/page.tsx` 和 `image/components/*`，包含会话、本地持久化、任务创建/恢复轮询、结果滚动、编辑和重试。 | 三栏 `ImageWorkspace`：会话栏、结果画布、参数检查器；移动端高级参数进入底部 Sheet。 | `useAuthGuard()`、管理员配额、`createImageGenerationTask`、`createImageEditTask`、`resumeImagePoll`、会话/参考图持久化和滚动记忆均不得重写为首页逻辑。 | 快捷创作草稿可安全消费；生成、编辑、恢复、重试、取消、刷新、参考图和多图数默认值验证通过。 | 任务状态截图、会话持久化测试、桌面/手机截图。 |
| `/image-manager` | `web/src/app/image-manager/page.tsx`，本地筛选、标签、选择、删除、下载、压缩和图片详情。 | `ImageLibraryPage` 使用 `DataTableShell`、`UploadPreview`、`EmptyState` 和右侧详情检查器。 | 管理员 guard；`fetchManagedImages`、标签、批量删除、下载、压缩、日期筛选、长按选择保持不变。 | 空/加载/失败、单项与批量选择、删除确认、下载和小屏单项操作通过。 | API smoke、交互录像/截图、375px 截图。 |
| `/accounts` | `web/src/app/accounts/page.tsx`，管理员账户池、筛选、排序、导入、批量操作和详情。 | `AccountsPage` 使用 `DataTableShell`、摘要筛选和 Sheet 详情。 | `useAuthGuard(["admin"])`；账户 API、排序、导入、详情与批量操作不得改变语义。 | 管理员可完成筛选、排序、导入、批量操作和详情；普通用户仍被拒绝；表格行不使用重阴影。 | 管理员/普通用户 guard、桌面/手机截图、关键操作 smoke test。 |
| `/register` | 上游 `1f96b49` 删除了注册 API、服务、页面和配置；Uni2API 初始版本因此没有该路由。 | 从上游 `66fee0c` 选择性恢复 `RegisterPage`、`RegisterCard`、注册 API/服务和邮箱 provider，并接入 `ConsoleShell`。 | 仅管理员可见；注册配置、SSE、代理/FlareSolverr、邮箱池、启动/停止/重置和自动加入账户池语义保持。 | 注册 API 权限和代理测试通过；页面无控制台错误；不得因恢复覆盖当前 OAuth 登录、工作台或账号任务逻辑。 | `test_register_api.py`、`test_register_proxy_runtime.py`、`pnpm build`、管理员浏览器 smoke test。 |
| `/logs` | `web/src/app/logs/page.tsx`，管理员日志筛选、表格、图片预览、详情和批量删除。 | `LogsPage` 使用固定筛选栏、`DataTableShell` 和可展开结构化详情。 | `useAuthGuard(["admin"])`；`fetchSystemLogs`、日期/类型筛选、详情图片、单项/批量删除仍可用。 | 已验证关联账户/任务入口、复制诊断信息、详情焦点恢复、批量删除和移动端单项操作。 | 过滤/详情/删除 smoke test 与断点截图。 |
| `/settings` | `web/src/app/settings/page.tsx`，横向 Tabs、初始化、账户池/备份轮询和多个配置 Dialog。 | `SettingsPage` 使用 `SettingsNav` 二级导航，移动端使用 Sheet。 | `useAuthGuard(["admin"])`；`useSettingsStore.initialize`、账户池/备份轮询、保存、导入、Dialog 和 `window` 更新事件保持。 | 脏状态/离开确认已实现；运行中任务轮询仍清理；每个设置区可达。 | 保存/离开/轮询测试，键盘与移动端截图。 |
| `/debug` | `web/src/app/debug/page.tsx`，管理员 Tabs：Skills、搜索、PPT、PSD、对话。 | `DebugPage` 放入管理员折叠“实验室”，内部请求/响应检查器统一样式。 | `useAuthGuard(["admin"])` 及 Skills、搜索、PPT、PSD、对话能力不变；Skill 名称中的 `chatgpt2api` 是兼容性例外。 | 各 Tab 核心能力可用，普通用户拒绝，折叠导航与深链可用。 | 五个 Tab 的 smoke test、角色验证。 |

## 3. 全局组件、样式与存储映射

| 当前实现 | 计划替代/迁移 | 删除或迁移门槛 | 不得误删的例外 |
| --- | --- | --- | --- |
| `web/src/app/layout.tsx`：`ThemeScript`、`TopNav`、棕色径向背景、`stone-*` 文本和页面 wrapper | 根布局改为 token 化 `ConsoleShell`；登录页单独无壳层渲染。 | 所有保留路由的壳层、主题、深链和角色测试通过。 | Toaster 的 live region 行为必须保留。 |
| `web/src/components/top-nav.tsx`、`header-actions.tsx`、`theme-toggle.tsx`、`theme-script.tsx`、`ui/animated-theme-toggler.tsx` | `ConsoleShell` 的用户菜单、主题控制、版本/仓库入口、第三方画布确认 Dialog。 | 新壳层覆盖画布跳转确认、退出、主题、版本入口和移动导航后，且无活跃导入。 | 上游 GitHub 链接保持原 URL，除非独立兼容性迁移批准。 |
| `ui/text-3d-flip.tsx`、`ui/morphing-text.tsx`、`ui/dia-text-reveal.tsx` | 无默认替代；只保留满足新动效规则且存在真实使用者的组件。 | 全仓引用审计、减少动效测试和依赖审计通过。 | 若新页面显式引入，必须在组件来源清单和动效规范中记录。 |
| `globals.css` 与页面级 `stone-*`、棕色背景、强制深色覆盖、`!important` 补丁 | `--ui-*` 浅/深主题 tokens、`SoftSurface`、平整数据表样式。 | 对应页面已迁移并在四个断点完成视觉回归。 | 密集表格/日志行不得为了 Soft UI 加回逐行重阴影。 |
| `chatgpt2api-theme` | `uni2api-theme`，含系统偏好与手动覆盖。 | 新键写入成功、重载后主题一致，再删除旧键。 | 失败时保留旧键并继续使用其值。 |
| auth localforage：`name: "chatgpt2api"`，`chatgpt2api_auth_key`、`chatgpt2api_auth_session` | 新 Uni2API localforage 实例和命名空间。 | 会话规范化、跨刷新登录、退出及角色重定向通过。 | 不得因迁移清空有效会话。 |
| 图像 local/session storage：`chatgpt2api:image_*` 和 `image_conversations` 实例 | 新 Uni2API 图像会话、参数和滚动位置键。 | 会话、参考图、任务恢复、参数和滚动位置均完成读旧写新回归。 | 迁移失败保留旧原始数据，不能用默认值覆盖。 |
| editable file history：`chatgpt2api` localforage 实例 | 新 Uni2API 可编辑文件历史实例。 | 草稿和删除记录双向读取验证通过。 | 调试页的 Skill 文案不是此存储迁移对象。 |
| 设置中的 `chatgpt2api/images` 与兼容 API/Skill 文案 | 无本次替代。 | 记录为兼容性例外，不纳入品牌全局替换。 | WebDAV 默认路径、上游 URL、兼容 API 示例、调试 Skill 标识必须保留。 |

## 4. 退役执行记录模板

每次完成一个路由或全局条目时，在此表追加记录后才能删除其旧实现：

```md
### <路由或全局条目>

- 新模块与提交：
- 保留行为验证：
- 角色与深链验证：
- 断点截图：375 / 768 / 1024 / 1440px
- 无障碍验证：键盘、焦点、对比度、reduced-motion
- 已删除的旧文件/样式/依赖：
- 存储迁移结果（如适用）：
- 回滚点：
```

## 5. 执行记录

### `/` 工作台与数据契约

- 新模块与提交：`api/dashboard.py`、`services/image_task_service.py`、`services/log_service.py`、`web/src/lib/api.ts`、`web/src/app/page.tsx`、`web/src/components/console/dashboard-signal-group.tsx`、`web/src/components/console/quick-create-panel.tsx`、`web/src/components/console/empty-state.tsx`
- 保留行为验证：工作台端点仅新增聚合读取，不修改现有图像任务、账户、日志或代理 API。
- 角色与深链验证：`test/test_dashboard_api.py` 覆盖管理员、普通用户、未授权；普通用户响应不含管理员字段；根路由和 `getDefaultRouteForRole` 已统一为 `/`。
- 断点截图：已生成 `output/playwright/admin-dashboard-1440.png` 与 `output/playwright/admin-dashboard-375-fixed.png`；768 / 1024px 待后续全路由验证阶段补齐。
- 无障碍验证：已提供稳定骨架、错误重试、空状态动作、非颜色状态图标、44px 控件和键盘提交；完整浏览器审计待 10.x。
- 已删除的旧文件/样式/依赖：旧首页跳转实现已替换；旧导航包装文件保留至壳层多角色/移动端验证完成。
- 存储迁移结果（如适用）：新增 `uni2api/workspace-quick-create` 草稿实例，消费后删除；旧图像会话存储尚未迁移。
- 回滚点：恢复旧根路由跳转并从 `api/app.py` 移除 dashboard router；现有页面 API 不受影响。

### 根布局与全局壳层

- 新模块与提交：`web/src/components/console/console-shell.tsx`、`navigation.ts`、`command-menu.tsx`、`theme-control.tsx`、`web/src/app/layout.tsx`
- 保留行为验证：认证校验、退出、第三方无限画布参数拼接与跳转确认均迁入新壳层；登录页保持无壳层。
- 角色与深链验证：导航和命令面板共用角色过滤配置，所有既有 href 保留；构建生成全部现有路由。
- 断点截图：待浏览器验证阶段补齐。
- 无障碍验证：提供跳到主内容、Sheet/Dialog 焦点基线、图标按钮名称、图标轨 Tooltip 和 Ctrl/Meta+K。
- 已删除的旧文件/样式/依赖：根布局已移除 `TopNav` 引用和旧棕色径向背景；旧包装文件尚未删除。
- 存储迁移结果（如适用）：主题首屏脚本和控制器支持从 `chatgpt2api-theme` 读取并写入 `uni2api-theme`。
- 回滚点：根布局重新挂载 `TopNav`，旧文件目前仍保留，可快速回退。
