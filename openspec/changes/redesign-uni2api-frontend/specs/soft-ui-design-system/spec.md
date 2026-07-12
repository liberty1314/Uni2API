## ADDED Requirements

### Requirement: 语义化 Soft UI tokens
系统 SHALL 定义浅色和深色主题的语义颜色、表面、文本、状态、圆角、阴影、焦点和动效 tokens，页面和通用组件 MUST 使用这些 tokens 而非散落的棕色或 stone 色值。

#### Scenario: 浅色主题加载
- **WHEN** 用户选择浅色主题或系统偏好为浅色
- **THEN** 应用 SHALL 使用云雾蓝画布、浮起表面、按入表面、钴蓝主操作和珊瑚创作强调 token

#### Scenario: 深色主题加载
- **WHEN** 用户选择深色主题或系统偏好为深色
- **THEN** 应用 SHALL 使用专门映射的深色表面、文字、阴影和焦点 token，而不得仅反转浅色颜色

### Requirement: 平衡型 Soft UI 层级
系统 SHALL 以平衡型 Soft UI 表达交互层级：主要壳层和操作面使用圆角与双向外阴影，输入和选中状态使用局部内阴影，密集数据行保持平整可扫描。

#### Scenario: 可交互表面获得深度反馈
- **WHEN** 用户查看主要侧栏、主面板、按钮或输入控件
- **THEN** 系统 SHALL 以定义的圆角和外凸或内凹阴影表达其层级与状态

#### Scenario: 查看密集数据表
- **WHEN** 用户查看账户或日志表格
- **THEN** 系统 SHALL 只将 Soft UI 外凸阴影用于表格容器，不得为每一行添加重阴影

### Requirement: 一致的组件状态
核心交互组件 SHALL 提供默认、悬停、键盘聚焦、按下、禁用、加载和错误状态，且状态变化不得改变控件布局尺寸。

#### Scenario: 键盘聚焦输入或按钮
- **WHEN** 用户通过键盘聚焦输入、按钮、导航项或图标按钮
- **THEN** 系统 SHALL 显示满足可见性的焦点 ring，而不得只依赖阴影变化

#### Scenario: 提交动作加载中
- **WHEN** 异步提交正在执行
- **THEN** 系统 SHALL 禁用重复提交、保留原按钮宽高，并提供可访问的加载状态

### Requirement: 统一组件来源与本地适配
系统 SHALL 使用 shadcn/ui、21st.dev Community Components 和 Uiverse Elements 作为组件候选来源，但 MUST 通过本地 Uni2API 适配层提供统一的 tokens、语义、图标、状态、响应式和动效行为。

#### Scenario: 采用基础交互原语
- **WHEN** 实现按钮、输入、选择、checkbox、dialog、sheet、popover、tabs、table、calendar 或 toast
- **THEN** 系统 SHALL 以 shadcn/ui 和其 Radix 行为作为基础，并将外部视觉候选适配到该原语，而不得用无语义的外部标记替换它

#### Scenario: 采用复合结构或微交互
- **WHEN** 实现侧栏、命令面板、仪表盘区块、空状态、上传预览或 Soft UI 微交互
- **THEN** 实施者 SHALL 先评估 21st.dev 和 Uiverse Elements 候选，并将选中候选本地化为使用 Uni2API tokens 和 Lucide 的组件

#### Scenario: 外部候选存在默认视觉语言
- **WHEN** 已选中的外部候选包含原始 palette、字体、圆角、阴影、动画、图标、演示文案或远程资源
- **THEN** 系统 MUST 删除或替换这些默认元素，使其不覆盖 Uni2API 设计系统或运行时加载第三方 CSS/JS

### Requirement: 组件来源审计
系统 SHALL 为每个新增或重构的复合组件记录三来源候选、作者/链接/许可证、评估结果、最终本地路径及拒绝理由。

#### Scenario: 选择组件候选
- **WHEN** 实施者准备新增或重构复合前端组件
- **THEN** 组件来源清单 SHALL 包含功能适配、栈适配、视觉适配、响应式、无障碍、适配成本和维护风险的评估，以及接受或拒绝结论

#### Scenario: 来源不可访问或许可证不明确
- **WHEN** 21st.dev 或 Uiverse Elements 候选无法访问、许可证不明确或无法满足无障碍要求
- **THEN** 实施者 MUST 记录该原因并拒绝或暂缓该候选，而不得伪造来源或直接采用未经审查的代码

### Requirement: 主题偏好迁移
系统 SHALL 在不丢失旧用户偏好的前提下将主题存储迁移到 Uni2API 命名空间。

#### Scenario: 检测到旧主题偏好
- **WHEN** 本地存储仅存在旧 `chatgpt2api-theme` 值
- **THEN** 系统 SHALL 读取该值、写入新的 Uni2API 主题键并用该主题初始化页面

### Requirement: 文本与状态可读性
普通文本和状态文案 SHALL 满足至少 4.5:1 的对比度，且成功、警告、错误和选中状态 MUST 使用图标或文字与颜色共同表达。

#### Scenario: 状态颜色被呈现
- **WHEN** 页面显示成功、警告或错误状态
- **THEN** 系统 SHALL 同时提供状态图标和可读状态文字
