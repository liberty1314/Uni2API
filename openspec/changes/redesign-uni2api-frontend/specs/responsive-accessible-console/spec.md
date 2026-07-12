## ADDED Requirements

### Requirement: 断点布局矩阵
系统 SHALL 在 375px、768px、1024px 和 1440px 视口维持可操作的控制台布局，并不得产生页面级横向溢出。

#### Scenario: 小手机工作台
- **WHEN** 视口宽度为 375px
- **THEN** 系统 SHALL 使用抽屉导航、单列主行动区和两列作品网格，且核心指标和主要动作可见可点击

#### Scenario: 平板和桌面工作台
- **WHEN** 视口宽度为 768px、1024px 或 1440px
- **THEN** 系统 SHALL 按定义的图标轨或展开侧栏、指标列数和内容网格呈现，且文本不会遮挡相邻控件

### Requirement: 移动端管理功能降级
系统 SHALL 在手机端保留账户池和日志的搜索、筛选、详情和单项操作，并对批量导入、跨列比较和高级配置提供明确的桌面使用提示。

#### Scenario: 手机访问宽表管理页
- **WHEN** 用户在手机端打开账户池或运行日志
- **THEN** 系统 SHALL 折叠次要信息或通过详情 Sheet 展示，而不得强制整张表横向溢出页面

### Requirement: 键盘和读屏可访问性
系统 SHALL 提供逻辑焦点顺序、跳到主内容链接、图标按钮名称、语义状态和可访问的弹层焦点管理。

#### Scenario: 键盘进入应用
- **WHEN** 键盘用户从页面顶部开始 Tab 导航
- **THEN** 系统 SHALL 首先提供跳到主内容的入口，随后按视觉顺序聚焦导航和当前页面操作

#### Scenario: 打开和关闭弹层
- **WHEN** 用户通过键盘打开 Dialog 或 Sheet 并随后关闭
- **THEN** 焦点 SHALL 被限制在弹层内，并在关闭后返回触发控件

### Requirement: 动态状态与减少动效
系统 SHALL 为任务、错误和 toast 提供非抢焦点的状态通告，并在用户请求减少动效时移除非必要的位移和缩放。

#### Scenario: 异步动作完成
- **WHEN** 任务状态或保存结果更新
- **THEN** 系统 SHALL 通过 `aria-live` 或等效语义通告结果且不得抢走当前输入焦点

#### Scenario: 用户启用减少动效
- **WHEN** `prefers-reduced-motion` 为 reduce
- **THEN** 系统 SHALL 停用非必要的位移和缩放动画，同时保留必要的颜色或不透明度反馈
