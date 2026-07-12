## 1. 工作台数据契约与后端聚合

- [x] 1.1 为管理员和普通用户工作台汇总响应定义 Pydantic 模型、严重级别、警告动作和前端 TypeScript 类型。
- [x] 1.2 在 `AccountService`、`ImageTaskService` 和 `LogService` 增加有界的健康、未完成任务、最近任务和 24 小时调用统计查询，确保没有调用数据时成功率为无数据。
- [x] 1.3 新增受 `require_identity` 保护的 `GET /api/dashboard/summary`，按角色构建最小响应并接入账户、任务、日志、代理和最近图片数据。
- [x] 1.4 为汇总端点增加管理员、普通用户、无调用、阻断告警和未经授权场景的后端测试，确认普通用户响应不含管理员字段。
- [x] 1.5 运行 `uv run pytest test/test_image_task_service.py test/test_image_tasks_api.py test/test_proxy_runtime_api.py` 及新增工作台 API 测试。

## 2. 前端基础与品牌迁移

- [x] 2.1 将页面 metadata、登录文案、应用内名称和主题色更新为 Uni2API；保留对旧本地存储主题键的单次读取和迁移。
- [x] 2.2 在 `globals.css` 定义浅色/深色 Soft UI 语义 tokens：画布、浮起/按入表面、文本、状态、圆角、双向阴影、内阴影、焦点和动效。
- [x] 2.3 将 Button、Input、Textarea、Select、Tabs、Card、Table、Dialog、Sheet、Badge 等通用组件归一到 tokens，并补齐 default、hover、focus、active、disabled、loading、error 状态。
- [x] 2.4 为主题切换实现浅色默认、跟随系统、手动覆盖及 `prefers-reduced-motion` 下的稳定行为。
- [x] 2.5 在设计 token 层验证正文、辅助文字、主操作、成功、警告和危险状态的 WCAG AA 对比度。
- [x] 2.6 维护 `component-sourcing-register.md` 与本地适配目录约定：`web/src/components/ui/` 作为 shadcn/ui 原语出口，`web/src/components/console/` 作为 21st.dev/Uiverse 复合组件适配层；初始清单必须覆盖 `ConsoleShell`、`ConsoleSidebar`、`CommandMenu`、`DashboardSignalGroup`、`QuickCreatePanel`、`UploadPreview`、`SoftSurface`、`EmptyState`、`DataTableShell`、`SettingsNav` 的来源、作者、许可证、评估、决策和最终路径。
- [x] 2.7 为清单中的每个组件分别检索 21st.dev 与 Uiverse Elements 的功能/交互/Soft UI 候选；每类比较 2–4 个候选，并以功能、技术栈、视觉、响应式、无障碍、适配成本、维护风险七项记录采用或拒绝理由。来源不可访问时记录 HTTP/访问限制、日期和待补选范围，而不伪造选择。
- [x] 2.7.1 在复制任何外部代码或样式前，核验候选作者、许可证、附加依赖和运行时资源；许可证不明确、依赖与 Radix/motion 重叠、无法满足可访问性或包含连续装饰动画的候选必须拒绝或暂缓。缺失 Tooltip、DropdownMenu、Switch、Skeleton、Command 等语义原语时，先通过 shadcn/ui 评估并用 `pnpm` 添加最小依赖。
- [ ] 2.8 选定 shadcn/ui 基础原语、21st.dev 复合结构和 Uiverse 微交互候选后，将其本地化：移除默认 palette、字体、圆角、阴影、图标、演示数据、远程资源和不合规动画，改接 Uni2API tokens、Lucide、数据流与可访问性状态。
- [ ] 2.9 在组件展示/验证页面检查三来源适配组件的浅色、深色、键盘、44px 触摸目标、对比度、减少动效、小屏与 loading/error 状态；拒绝无法达标的候选。

## 3. 应用壳层与全局导航

> 2026-07-12 增量修复：重设计后普通用户创建功能仍存在于“设置 → 用户密钥”，但主导航缺少可发现入口。新增管理员专属 `/users`“用户管理”入口，直接复用 `UserKeysCard` 与既有用户密钥 API，不复制创建逻辑；“账户池”继续只负责上游账号导入。

- [x] 3.1 创建角色过滤的导航配置，覆盖工作台、创作、图片库、账户池、日志、设置和折叠实验室，并保留全部既有 href。
- [x] 3.2 从已审查的 21st.dev Sidebar/导航候选和 Uiverse Soft UI 表面候选中选择结构与微交互，并以 shadcn/ui Sheet、Button、Tooltip 等基础原语实现 `ConsoleShell`、展开侧栏、平板图标轨、手机抽屉、跳到主内容链接和全局用户菜单；登录页保持无壳层。
- [x] 3.3 以 `ConsoleShell` 替换根布局中的横向 `TopNav`，保留认证 guard、退出逻辑和第三方画布跳转确认。
- [x] 3.4 实现 `Ctrl+K`/`Meta+K` 命令面板，按角色过滤页面和操作，并确保键盘打开、关闭和焦点恢复。
- [x] 3.5 将根路由和 `getDefaultRouteForRole` 改为工作台入口，同时验证现有深链、角色拒绝和回退导航状态不变。

## 4. 角色自适应工作台

- [x] 4.1 创建工作台页面、汇总数据 hook 和稳定尺寸的加载/错误/空状态组件；使用 `/api/dashboard/summary` 而不在浏览器聚合原始日志。
- [ ] 4.2 从已审查的 21st.dev Dashboard/Empty State 候选和 Uiverse Card/Loader 候选中适配管理员工作台的四项核心信号、运行信号区、最新作品、任务状态与非阻断告警，匹配设计草图的层级和 Soft UI 密度。
- [x] 4.3 实现普通用户工作台，只呈现个人未完成任务、个人最近作品、模型和创作入口；验证没有管理员数据渲染或请求泄露。
- [x] 4.4 根据服务端严重级别实现“开始创作”与“处理异常”的主操作切换，阻断状态禁用快捷提交并导航到诊断路径。
- [x] 4.5 为任务运行和账户刷新编写受控轮询与清理逻辑，避免路由卸载后的状态更新或无休止请求。

## 5. 快捷创作与完整创作页承接

- [x] 5.1 定义并实现 `workspace-quick-create` 本地草稿存储，支持提示词、模型、画幅、质量、数量和参考图，并在消费后清理。
- [ ] 5.2 以 shadcn/ui 表单原语为行为基础，并从已审查的 21st.dev Upload/AI Chat 候选和 Uiverse Input/Button 候选中适配工作台快捷创作表单、`Ctrl+Enter`/`Meta+Enter` 提交、可访问 label、参考图选择和阻断状态保护。
- [x] 5.3 在 `/image` 消费工作台草稿，预填既有 composer、会话和参考图逻辑，不复制任务创建、轮询或重试实现。
- [x] 5.4 明确数量控件行为：若异步服务未支持 `n`，将数量作为完整创作页默认值；若扩展后端支持多图，则同时更新任务请求、结果处理和测试。
- [ ] 5.5 验证快捷创作从草稿到 `/image` 的成功、取消、刷新、阻断和带参考图场景。

## 6. 图像创作与图片库迁移

- [ ] 6.1 将 `/image` 重组为会话栏、结果画布和参数检查器，保留现有会话历史、结果滚动记忆、任务进度、编辑和重试行为。
- [ ] 6.2 为图像创作页实现桌面三栏、平板折叠和手机底部 Sheet 高级参数布局，确保 composer 和结果不会被固定栏遮挡。
- [ ] 6.3 以 shadcn/ui Table/Sheet/Checkbox 为行为基础，适配经审查的 21st.dev Table/Upload/Empty State 与 Uiverse 批量操作/加载候选，将 `/image-manager` 迁移到统一壳层并重做筛选、标签、网格、选择、批量操作栏和右侧详情检查器，保留删除与下载 API。
- [ ] 6.4 为图片库实现加载骨架、空状态创作入口、失败重试和图片可访问替代文本。

## 7. 账户、日志、设置与实验室迁移

> 2026-07-12 上游兼容恢复：当前项目基于 `basketikun/chatgpt2api` 的 `1f96b49 refactor: remove registration functionality and related configurations` 之后版本，导致 `66fee0c` 时仍存在的注册机被整体删除。本次没有硬重置 Uni2API，而是从本地上游仓库 `/Users/abner/Desktop/MyProject/chatgpt2api` 的 `66fee0c133599fc443997340ca00061a8ee261d9` 选择性恢复注册 API、注册服务、邮箱提供商、OpenAI 注册流程、配置/备份字段、前端 API/store、`/register` 页面和管理员导航。保留当前 `openai_oauth.py`、工作台、认证角色和新壳层；新增注册 API 权限测试并恢复代理运行时测试。注册页已接入 Uni2API 壳层，后续仍需按 7.x/9.x 完成全面 Soft UI 与断点迁移。

- [x] 7.0 从上游 `66fee0c` 选择性恢复注册机后端、配置备份、前端 API/store、管理员 `/register` 页面和侧栏入口；保留当前 OAuth 与前端重设计，并通过注册 API 权限测试、代理运行时测试、TypeScript、相关 ESLint 和生产构建验证。
- [ ] 7.1 以 shadcn/ui Table/Sheet/Checkbox 为行为基础，适配经审查的 21st.dev Table 与 Uiverse 状态/操作候选，将 `/accounts` 迁移到 Soft UI 表格容器，连接可用/限流/异常/禁用摘要筛选，保留排序、批量操作、详情 Sheet 和导入流程。
- [ ] 7.2 以 shadcn/ui Table/Dialog/Popover 为行为基础，适配经审查的 21st.dev Table/Command 候选和 Uiverse loading/tooltip 候选，将 `/logs` 迁移到固定筛选栏与可展开结构化详情，保留删除行为并提供关联账户、任务和复制诊断信息操作。
- [ ] 7.3 以 shadcn/ui Tabs/Sheet/Dialog 为行为基础，适配经审查的 21st.dev Settings/Sidebar 候选和 Uiverse 控件表面候选，将 `/settings` 从横向主标签迁移为二级设置导航；保留现有 Zustand 初始化、轮询和 API 保存流程，补齐脏状态和离开确认。
- [ ] 7.4 将 `/debug` 保留在管理员折叠实验室中，统一请求/响应检查器样式，不改变其 Skills、搜索、PPT、PSD 和对话能力。
- [x] 7.5 重设计 `/login` 为 Uni2API 单任务认证页，补齐密钥显示/隐藏、粘贴反馈、字段级错误和键盘可达性。

## 8. 旧前端退役与清理

- [ ] 8.1 维护 `legacy-route-retirement-map.md`：为 `/`、`/login`、`/image`、`/image-manager`、`/accounts`、`/logs`、`/settings`、`/debug` 及根布局/全局组件逐项记录旧页面结构、对应新模块、角色权限、数据源、交互、视觉截图、回归验证和回滚点；确认保留 URL 而不是保留旧页面实现。
- [ ] 8.2 在 `ConsoleShell` 通过管理员、普通用户、移动端和深链验证后，删除旧 `TopNav`、`HeaderActions`、`ThemeToggle`、`ThemeScript`、旧 `AnimatedThemeToggler` 及其专属导入，或将仍需复用的最小逻辑迁入新壳层后删除旧包装文件。
- [ ] 8.3 对 `text-3d-flip.tsx`、`morphing-text.tsx`、`dia-text-reveal.tsx` 和其他候选视觉组件执行全仓引用审计；删除确认无人引用的文件及其样式/依赖，任何保留组件必须符合新动效和减少动效规范。
- [ ] 8.4 在全部路由完成 token 迁移和视觉回归后，删除旧棕色径向背景、`.dark` 下强制覆盖 `bg-white`/`stone-*` 的补丁、未使用 `!important` 规则、旧页面 wrapper 和被新模块替换的 JSX/CSS；每次删除后运行构建和路由 smoke test。
- [ ] 8.5 为主题、认证、图像会话、可编辑文件历史等旧 `chatgpt2api` 本地存储命名空间实现“读旧→写新→确认→删旧”的迁移；迁移失败时保留旧数据并测试主题、会话和草稿不丢失。
- [ ] 8.6 运行前端残留审计：用户可见品牌、废弃导航、死组件、旧样式和过时存储键 MUST 不再被活跃前端引用；上游仓库 URL、WebDAV 路径、兼容 API 示例和调试 Skill 标识 MUST 作为文档化例外保留，不得批量替换。

## 9. 响应式、无障碍与性能

- [ ] 9.1 实现并检查 375px、768px、1024px、1440px 的壳层、工作台、创作、图片库、账户、日志和设置布局，修复页面级横向溢出和文本遮挡。
- [ ] 9.2 为移动端账户和日志提供可用的搜索、筛选、详情和单项操作，并对批量导入、跨列比较和高级配置提供明确桌面提示。
- [ ] 9.3 完成跳到主内容、逻辑 Tab 顺序、图标按钮名称、Dialog/Sheet 焦点陷阱与返回、`aria-live` 任务/错误反馈和非颜色状态标识。
- [ ] 9.4 对长图片和日志列表评估并实施必要的虚拟化或增量渲染；为缩略图保留稳定比例和延迟加载，避免 CLS。
- [ ] 9.5 在减少动效模式下验证无非必要平移/缩放，且所有核心交互仍有可感知反馈。

## 10. 验证与视觉回归

> 2026-07-12 增量记录：修复登录页 hydration overlay。根布局主题初始化脚本改为稳定 `id` 的内联脚本，并对脚本及 `<head>` 处理浏览器扩展在 hydration 前注入节点的情况；Playwright 无扩展浏览器验证无 hydration console error。10.2 仍待全部路由 lint 与最终回归完成后再勾选。

- [ ] 10.1 运行受影响后端测试与 `uv run pytest`，修复工作台汇总、图像任务、账户和代理相关回归。
- [ ] 10.2 使用 `pnpm` 在 `web/` 运行 lint、类型检查（若配置）和 `pnpm build`，修复所有构建与 hydration 问题。
- [ ] 10.3 使用本地浏览器在管理员正常、管理员阻断、普通用户、空数据、加载、深色和 reduced-motion 状态下执行核心路径验证。
- [ ] 10.4 采集 375px、768px、1024px 和 1440px 截图，与 `docs/design/assets/uni2api-admin-dashboard-soft-ui.png` 对照检查导航、色彩、圆角、双向阴影、内阴影、信息密度、文本和作品网格。
- [ ] 10.5 执行最终可访问性、对比度和旧前端残留检查，确认所有普通文字达到 4.5:1、触摸目标不小于 44px，且无图标-only 无标签控件或未授权的旧实现。
- [ ] 10.6 审核组件来源清单，确认每个活跃复合组件均有 shadcn/ui、21st.dev 或 Uiverse Elements 的记录、采用/拒绝理由、本地路径和许可证信息，且没有运行时第三方 CSS/JS、未归一的默认视觉或重复组件实现。

## 11. 文档与发布准备

- [ ] 11.1 更新 README 和需要展示产品名称的前端文档为 Uni2API，保留历史项目名仅在迁移或兼容性说明中出现。
- [ ] 11.2 更新设计文档中的实现状态、记录与草图的有意偏差，并将最终截图和验证结果链接到变更记录。
- [ ] 11.3 审查变更范围，确认没有改变 OpenAI 兼容 API、认证角色、既有 URL、账号轮询和图像任务语义；为应用壳层、工作台接口和旧实现退役准备回滚说明。
- [ ] 11.4 运行 `openspec validate redesign-uni2api-frontend --strict`，修复所有 proposal、design、specs 和 tasks 验证错误。
