## ADDED Requirements

### Requirement: 统一应用壳层与品牌
系统 SHALL 在所有已认证的非登录路由中渲染 Uni2API 应用壳层，并将应用内可见品牌名称统一为 Uni2API。

#### Scenario: 已认证管理员打开现有管理页面
- **WHEN** 管理员访问 `/accounts`、`/logs`、`/settings` 或 `/debug`
- **THEN** 页面 SHALL 显示 Uni2API 应用壳层和当前路由内容，且不改变目标 URL

#### Scenario: 未认证访问受保护页面
- **WHEN** 未认证访问任一需要会话的路由
- **THEN** 系统 SHALL 跳转到 `/login` 且不渲染应用壳层

### Requirement: 角色分组导航
系统 SHALL 在单一导航配置中定义概览、创作、管理、系统和实验室分组，并 MUST 根据会话角色过滤不可访问的导航项与命令项。

#### Scenario: 管理员查看导航
- **WHEN** 管理员会话加载应用壳层
- **THEN** 系统 SHALL 显示工作台、图像创作、图片库、账户池、运行日志、设置和折叠的实验室入口

#### Scenario: 普通用户查看导航
- **WHEN** 普通用户会话加载应用壳层
- **THEN** 系统 SHALL 只显示其允许访问的工作台和创作入口，且不得显示管理员管理页面或其命令

### Requirement: 自适应导航呈现
应用壳层 SHALL 在桌面、平板和手机维持相同导航层级，并使用符合断点的呈现方式。

#### Scenario: 桌面侧栏展开
- **WHEN** 视口宽度大于或等于 1280px
- **THEN** 系统 SHALL 渲染带文字标签的常驻侧栏

#### Scenario: 平板侧栏收窄
- **WHEN** 视口宽度在 768px 至 1279px 之间
- **THEN** 系统 SHALL 渲染图标轨并为每个图标提供可访问名称和键盘可见提示

#### Scenario: 手机导航抽屉
- **WHEN** 视口宽度小于 768px
- **THEN** 系统 SHALL 以菜单按钮打开导航抽屉，且抽屉关闭后焦点 MUST 返回触发按钮

### Requirement: 全局工具区
应用壳层 SHALL 提供主题切换、用户菜单、退出操作和可通过 `Ctrl+K` 或 `Meta+K` 打开的命令面板。

#### Scenario: 打开命令面板
- **WHEN** 用户按下 `Ctrl+K` 或 `Meta+K`
- **THEN** 系统 SHALL 打开命令面板并仅列出当前角色可访问的页面和操作

#### Scenario: 退出会话
- **WHEN** 用户从全局用户菜单执行退出
- **THEN** 系统 SHALL 清除保存的会话并导航到 `/login`
