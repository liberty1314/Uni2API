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
