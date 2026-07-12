## ADDED Requirements

### Requirement: 三来源组件选择流程
系统 SHALL 为每个新增或重构的前端组件执行 shadcn/ui、21st.dev Community Components 和 Uiverse Elements 的来源选择流程，并将最终组件收敛为 Uni2API 本地组件。

#### Scenario: 选择基础原语
- **WHEN** 需要实现标准按钮、输入、选择、checkbox、dialog、sheet、popover、tabs、table、calendar 或 toast
- **THEN** 系统 MUST 使用 shadcn/ui 作为语义、Radix 交互和可访问性基础，并仅在其上叠加经审查的视觉适配

#### Scenario: 选择复合组件
- **WHEN** 需要实现侧栏、命令面板、工作台区块、空状态、上传预览、设置导航或管理表格外壳
- **THEN** 实施者 SHALL 先在 21st.dev 和 Uiverse Elements 按功能、交互和 Soft UI 风格检索候选，并记录最终选择或拒绝原因

### Requirement: 组件来源清单
系统 SHALL 维护组件来源清单，记录每个采用或拒绝的外部候选及其本地适配结果。

#### Scenario: 记录采用的外部候选
- **WHEN** 外部组件候选被采用
- **THEN** 清单 SHALL 记录来源站点、URL、作者、许可证、候选类型、适配后的本地组件路径、保留结构/交互和被替换的默认视觉元素

#### Scenario: 记录拒绝的外部候选
- **WHEN** 候选因功能、技术栈、视觉、响应式、无障碍、适配成本、维护风险、来源不可访问或许可证问题被拒绝
- **THEN** 清单 SHALL 记录拒绝原因和采用的替代方案

### Requirement: 统一视觉与交互契约
所有从三方来源采用的组件 SHALL 使用 Uni2API 的语义 tokens、Lucide 图标、圆角、阴影、动效和可访问性状态，而不得保留外部来源的默认视觉或行为契约。

#### Scenario: 外部候选被本地化
- **WHEN** 外部候选被写入 Uni2API 代码库
- **THEN** 组件 MUST 使用 `web/src/components/ui/` 中的基础原语或其稳定 API，并从本地 token 获取颜色、间距、圆角、阴影和动效

#### Scenario: 运行时加载约束
- **WHEN** Uni2API 运行前端页面
- **THEN** 前端 MUST 不从 21st.dev 或 Uiverse Elements 远程加载组件 CSS、JavaScript、字体或图标资源

### Requirement: 外部组件可访问性与性能门槛
系统 SHALL 在采用外部候选前验证键盘操作、可见焦点、语义元素、44px 触摸目标、文本对比度和减少动效行为。

#### Scenario: 候选不满足门槛
- **WHEN** 外部候选无法在本地适配后满足可访问性、性能或布局稳定性门槛
- **THEN** 系统 MUST 拒绝该候选并使用满足门槛的替代组件

#### Scenario: 候选含有装饰性动画
- **WHEN** 外部候选使用持续、布局驱动或无法中断的动画
- **THEN** 系统 MUST 移除该动画或在 `prefers-reduced-motion` 下提供无位移/缩放的替代行为
