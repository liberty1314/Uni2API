# Uni2API 组件来源清单

> 状态：已进入本地实现；外部候选仅作为结构参考，未复制未经核验的代码。Uiverse 仍因访问限制保持待补选。

## 1. 用途与裁决规则

本清单是 `redesign-uni2api-frontend` 变更的组件来源事实记录。实施者在创建或重构复合组件前，必须先补全对应记录；通过审核后才可以本地化代码。变更完成后，将本清单的最终结果归档到 `docs/design/`。

- `shadcn/ui` 是唯一的语义、Radix 交互和无障碍原语出口，目标目录为 `web/src/components/ui/`。
- 21st.dev 只提供复合结构和交互的候选，目标目录为 `web/src/components/console/`；不得直接保留其 demo 数据、远程资源或默认视觉。
- Uiverse Elements 只提供受审查的 Soft UI 微交互候选，不能替代语义 `button`、`input`、`dialog`、`sheet` 或表格原语。
- 任一候选只有同时满足许可证可核验、键盘可达、可见焦点、44px 触摸目标、`prefers-reduced-motion`、响应式、token 本地化和无运行时远程资源时，状态才可从“待审核”变为“采用”。
- 本清单出现“作者”时，仅表示候选页面或源码 URL 暴露的发布者 handle；在来源未明确给出许可证前，作者身份和许可证均不得推定。

## 2. 已核验的发现条件

核验时间：2026-07-12。

| 来源 | 已知事实 | 对实施的含义 |
| --- | --- | --- |
| shadcn/ui | 现有项目已配置 `components.json`，并已本地维护 Button、Input、Textarea、Select、Checkbox、Dialog、Sheet、Popover、Tabs、Table、Card、Badge 等原语。 | 可先以既有本地原语重设 token；缺失的 Tooltip、DropdownMenu、Switch、Skeleton、Command 等必须通过 shadcn/ui 补充，而不是复制外部无语义实现。 |
| [21st.dev Community Components](https://21st.dev/community/components) | 分类页及 Sidebar、Command menu、Dashboard、Empty state、Upload/Download、Table、Settings、Tabs、AI chat 分类在本次会话可访问。下表链接的是该站点公开的候选 demo 源码。 | 可列入短名单，但每个候选仍需在采用前检查依赖、许可证和交互实现。 |
| [Uiverse Elements](https://uiverse.io/elements) | 本次会话访问返回 Cloudflare `403`，无法检索具体作品、作者或许可证。 | 所有 Uiverse 项保持“来源不可访问，待补选”；不得编造候选或复制未经核验的代码。该项是发布前必须补齐的门槛，而不是可以静默跳过的要求。 |

## 3. 初始组件矩阵

“21st.dev 短名单”中的候选均为待审核项，许可证统一为“待核验”。“Uiverse 状态”在来源恢复可访问后，至少应为每个适用模块比较两个候选，并逐条补齐作者、URL、许可证及结论。

| 目标组件 | shadcn/ui 语义基础 | 21st.dev 短名单（作者 handle） | Uiverse 状态与候选范围 | 计划本地路径 | 当前裁决 |
| --- | --- | --- | --- | --- | --- |
| `ConsoleShell` | Button、Sheet、Dialog、Input；Tooltip 待以 shadcn/ui 增补 | [dashboard-sidebar](https://cdn.21st.dev/arunjdass/dashboard-sidebar/default/code.demo.1781812420625.tsx)（`arunjdass`）；[dashboard-with-collapsible-sidebar](https://cdn.21st.dev/uniquesonu/dashboard-with-collapsible-sidebar/default/code.demo.1755346172257.tsx)（`uniquesonu`） | 来源不可访问；补选外凸容器与折叠反馈，不改变导航语义 | `web/src/components/console/console-shell.tsx` | 结构候选待审核；不可直接采用 |
| `ConsoleSidebar` | Button、Sheet、Popover；Tooltip 待增补 | [sidebar-component](https://cdn.21st.dev/larsen66/sidebar-component/default/code.demo.1756233832683.tsx)（`larsen66`）；[dashboard-sidebar](https://cdn.21st.dev/arunjdass/dashboard-sidebar/default/code.demo.1781812420625.tsx)（`arunjdass`） | 来源不可访问；补选选中项的内阴影反馈 | `web/src/components/console/console-sidebar.tsx` | 结构候选待审核；导航配置和权限过滤仍由 Uni2API 实现 |
| `CommandMenu` | Dialog、Input、Button；若采用 shadcn Command，先用 `pnpm` 增加其 `cmdk` 依赖 | [command-menu](https://cdn.21st.dev/preetsuthar17/command-menu/default/code.demo.1753354227023.tsx)（`preetsuthar17`）；[omni-command-palette](https://cdn.21st.dev/lovesickfromthe6ix/omni-command-palette/default/code.demo.1755732330311.tsx)（`lovesickfromthe6ix`） | 来源不可访问；补选 loader/tooltip，不接受圆形或持续动画菜单 | `web/src/components/console/command-menu.tsx` | 交互候选待审核；焦点恢复和角色过滤为强制本地行为 |
| `DashboardSignalGroup` | Card、Badge、Button；Skeleton 待以 shadcn/ui 增补 | [stats-cards](https://cdn.21st.dev/beratberkayg/stats-cards/default/code.demo.1752777592319.tsx)（`beratberkayg`）；[dashboard-template-neumorphism](https://cdn.21st.dev/dadopelanosvela/dashboard-template-neumorphism/default/code.demo.1756700725187.tsx)（`dadopelanosvela`） | 来源不可访问；补选局部卡片按压和加载反馈 | `web/src/components/console/dashboard-signal-group.tsx` | 待审核；拒绝过度拟物、嵌套卡片和装饰性 3D 动画 |
| `QuickCreatePanel` | Field、Label、Textarea、Select、Input、Button、Dialog/Sheet | [prompt-input](https://cdn.21st.dev/user_2rkgEMvkQ7I2oxalLXELCy8NObN/prompt-input/with-actions/code.demo.tsx?v=1)（`user_2rkgEMvkQ7I2oxalLXELCy8NObN`）；[ai-input-with-file](https://cdn.21st.dev/user_2rQ1QHrJyxpmWMHhqhANzWMc64n/ai-input-with-file/default/code.demo.tsx)（`user_2rQ1QHrJyxpmWMHhqhANzWMc64n`） | 来源不可访问；补选主按钮和输入按入反馈 | `web/src/components/console/quick-create-panel.tsx` | 待审核；只能写草稿并跳转 `/image`，不得复制 demo 的模拟生成逻辑 |
| `UploadPreview` | Input、Label、Button、Dialog/Sheet | [use-image-upload](https://cdn.21st.dev/user_originui/use-image-upload/default/code.demo.tsx?v=1)（`user_originui`）；[file-upload](https://cdn.21st.dev/user_aceternity/file-upload/default/code.demo.tsx)（`user_aceternity`） | 来源不可访问；补选删除/拖放/加载的微交互，不以 click-div 取代文件输入 | `web/src/components/console/upload-preview.tsx` | 待审核；必须复用现有参考图数据流，补齐键盘和替代文本 |
| `SoftSurface` | 不单独替代 shadcn 语义原语；承载其子组件的 token 化容器 | [dashboard-template-neumorphism](https://cdn.21st.dev/dadopelanosvela/dashboard-template-neumorphism/default/code.demo.1756700725187.tsx)（`dadopelanosvela`）；[stats-cards](https://cdn.21st.dev/beratberkayg/stats-cards/default/code.demo.1752777592319.tsx)（`beratberkayg`） | 来源不可访问；这是优先补选项，范围为双向外阴影、内阴影和轻量 hover，不含额外 DOM 行为 | `web/src/components/console/soft-surface.tsx` | 待审核；若 Uiverse 仍不可用，不能把未核验样式标记为来自 Uiverse |
| `EmptyState` | Button、Card、Sheet | [empty-state-beautiful-accessible-no-data-states](https://cdn.21st.dev/uniquesonu/empty-state-beautiful-accessible-no-data-states/default/code.demo.1758875891254.tsx)（`uniquesonu`）；[empty](https://cdn.21st.dev/j1zuzz/empty/default/code.demo.1761762786796.tsx)（`j1zuzz`） | 来源不可访问；补选轻量插图/加载反馈，禁止连续动画或依赖远程图像 | `web/src/components/console/empty-state.tsx` | 待审核；必须提供下一步动作且不把状态只交给颜色表达 |
| `DataTableShell` | Table、Checkbox、Button、Sheet、Dialog、Popover；DropdownMenu、Tooltip、Skeleton 待以 shadcn/ui 增补 | [server-management-table](https://cdn.21st.dev/isaiahbjork/server-management-table/default/code.demo.1757883904819.tsx)（`isaiahbjork`）；[interactive-logs-table-shadcnui](https://cdn.21st.dev/larsen66/interactive-logs-table-shadcnui/demos/default/code.demo.1773289980850.tsx)（`larsen66`） | 来源不可访问；补选状态 loader、tooltip 和批量操作按压反馈 | `web/src/components/console/data-table-shell.tsx` | 待审核；表格行保持平整，不得继承候选中的逐行重阴影或演示数据 |
| `SettingsNav` | Tabs、Sheet、Dialog、Button、Input；Switch、Tooltip 待以 shadcn/ui 增补 | [account-settings](https://cdn.21st.dev/sshahaider/account-settings/default/code.demo.1758358596527.tsx)（`sshahaider`）；[vertical-with-icons tabs](https://cdn.21st.dev/coss.com/tabs/vertical-with-icons/code.demo.1774357976645.tsx)（`coss.com`） | 来源不可访问；补选 switch/tooltip 的反馈，不替换 Radix 控件 | `web/src/components/console/settings-nav.tsx` | 待审核；需保留现有设置 store、脏状态和离开确认 |

## 4. 候选记录与评分模板

## 4.1 本轮候选评估记录

核验时间：2026-07-12。21st.dev 候选通过公开源码 URL 进行结构级比较；未复制源码。Uiverse Elements 访问返回 Cloudflare `403`，因此每个目标均记录为“待补选”，没有虚构作者、作品或许可证。评分采用“通过 / 条件通过 / 暂缓 / 拒绝”，并覆盖功能、技术栈、视觉、响应式、无障碍、适配成本、维护风险七项。

| 目标组件 | 候选比较 | 功能 | 技术栈 | 视觉 | 响应式 | 无障碍 | 适配成本 | 维护风险 | 裁决 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ConsoleShell` | `arunjdass/dashboard-sidebar` vs `uniquesonu/dashboard-with-collapsible-sidebar` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 中 | 中 | 采用结构思路，行为以 Radix Sheet/Tooltip 重建 |
| `ConsoleSidebar` | `larsen66/sidebar-component` vs `arunjdass/dashboard-sidebar` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 中 | 中 | 采用结构思路，权限过滤本地实现 |
| `CommandMenu` | `preetsuthar17/command-menu` vs `lovesickfromthe6ix/omni-command-palette` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 中 | 中高 | 暂缓外部源码，优先 Dialog/Input 本地化 |
| `DashboardSignalGroup` | `beratberkayg/stats-cards` vs `dadopelanosvela/dashboard-template-neumorphism` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 低 | 中 | 采用信息层级，拒绝逐卡重阴影和 3D 装饰 |
| `QuickCreatePanel` | `user_2rkgEMvkQ7I2oxalLXELCy8NObN/prompt-input` vs `user_2rQ1QHrJyxpmWMHhqhANzWMc64n/ai-input-with-file` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 中 | 中 | 采用输入区结构，草稿流本地实现 |
| `UploadPreview` | `user_originui/use-image-upload` vs `user_aceternity/file-upload` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 中 | 中高 | 暂缓外部上传代码，保留原生 file input |
| `SoftSurface` | `dadopelanosvela/dashboard-template-neumorphism` vs `beratberkayg/stats-cards` | 通过 | 条件通过 | 通过 | 通过 | 通过 | 低 | 低 | 采用双向/内阴影概念，全部由 `--ui-*` token 提供 |
| `EmptyState` | `uniquesonu/empty-state-beautiful-accessible-no-data-states` vs `j1zuzz/empty` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 低 | 中 | 采用文案与动作层级，移除远程插图 |
| `DataTableShell` | `isaiahbjork/server-management-table` vs `larsen66/interactive-logs-table-shadcnui` | 通过 | 通过 | 条件通过 | 通过 | 条件通过 | 中 | 中 | 采用容器与筛选结构，行保持平整 |
| `SettingsNav` | `sshahaider/account-settings` vs `coss.com/tabs/vertical-with-icons` | 通过 | 条件通过 | 条件通过 | 通过 | 条件通过 | 中 | 中 | 采用二级导航结构，状态与脏数据本地保留 |

上述 21st.dev 候选的作者/handle 和源码链接均已在第 3 节列出；许可证未从候选页或仓库元数据得到明确证据的，一律保留“待核验”，不作为可复制来源。Uiverse 的比较范围为 Soft UI 表面、按钮/输入按压、loader、tooltip 和状态反馈，每个目标至少需要两个可访问候选后才可补录采用结论。

每一个上表短名单中的候选都必须在作出采用或拒绝决定前复制以下记录。评分为 `通过`、`条件通过` 或 `拒绝`，不以展示效果替代可维护性判断。

```md
### <组件>/<候选 ID>

- 来源：<shadcn/ui | 21st.dev | Uiverse Elements>
- URL：<候选页面或源码 URL>
- 作者：<来源显示的作者名称或 handle；未知则写未知>
- 许可证：<许可证名称和证据链接；未确认则写待核验>
- 目标本地路径：<web/src/components/ui/... 或 web/src/components/console/...>
- 保留内容：<仅限可复用的结构或交互>
- 替换内容：<palette、字体、圆角、阴影、图标、动画、demo 数据、远程资源>

| 维度 | 结论 | 证据或处理方式 |
| --- | --- | --- |
| 功能适配 | 待评分 | |
| 技术栈适配 | 待评分 | React 19、Next.js 16、Tailwind CSS 4、既有 Radix/shadcn/ui |
| 视觉适配 | 待评分 | Uni2API Soft UI tokens，不能保留外部默认 palette |
| 响应式 | 待评分 | 375 / 768 / 1024 / 1440px |
| 无障碍 | 待评分 | 语义、键盘、焦点、44px、live region、减少动效 |
| 适配成本 | 待评分 | 依赖、重写量、测试量 |
| 维护风险 | 待评分 | 许可证、上游耦合、复杂状态、动画、性能 |

- 结论：<采用 | 条件采用 | 暂缓 | 拒绝>
- 结论理由：<可审计的理由>
- 验收证据：<组件测试/截图/键盘路径/许可证证据链接>
```

## 5. 本地化与审核关卡

1. **候选发现**：每个组件从 21st.dev 和 Uiverse 分别检索 2–4 个候选；来源不可访问时记录 HTTP/访问限制与日期。
2. **许可证和依赖核验**：在下载或复制代码前记录许可证证据、作者和额外依赖。依赖与现有 Radix、Motion 或 Tailwind 能力重复时默认拒绝。
3. **语义重建**：先使用 `web/src/components/ui/` 的 shadcn 原语建立 button、input、dialog、sheet、table 等行为；外部候选只可贡献结构或最小 CSS。
4. **token 归一**：移除外部颜色、字体、圆角、阴影、图标、远程 CSS/JS/字体、演示数据和不合规动画；改用 Uni2API `--ui-*` tokens、Lucide 和真实状态流。
5. **状态补齐**：default、hover、focus-visible、active、disabled、loading、error 均不应改变控件尺寸；密集表格行不得拥有重阴影。
6. **验收与归档**：用浅色、深色、键盘、375px、小屏抽屉、减少动效、加载和错误状态验证。未通过对比度、焦点、触摸目标或许可核验的候选必须拒绝或暂缓。

## 6. 与实施任务的映射

| 清单工作 | OpenSpec 任务 | 完成定义 |
| --- | --- | --- |
| 建立初始矩阵和目录边界 | 2.6 | 本文件覆盖全部十个目标组件，并明确 shadcn/ui 出口和 `console/` 适配层。 |
| 检索、许可证核验和候选裁决 | 2.7、2.7.1 | 每个目标有可追溯候选和结论；Uiverse 不可访问状态有事实记录，不能伪造。 |
| 本地适配 | 2.8、3.2、4.2、5.2、6.3、7.1–7.3 | 最终本地路径存在，外部默认视觉和运行时资源均已清除。 |
| 组件级验证与最终审计 | 2.9、10.6 | 清单补齐验收证据，所有活跃复合组件可回溯到已审核来源。 |
