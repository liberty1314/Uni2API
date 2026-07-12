## ADDED Requirements

### Requirement: 现有页面替换映射
系统 SHALL 在删除任一现有前端页面实现前维护替换映射，覆盖 `/`、`/login`、`/image`、`/image-manager`、`/accounts`、`/logs`、`/settings` 和 `/debug` 的路由、角色权限、数据源、主要交互和验证结果。

#### Scenario: 路由完成迁移
- **WHEN** 某个现有页面被新模块或新视图结构替换
- **THEN** 替换映射 SHALL 证明该路由仍保留原 URL、权限边界、核心数据源和可验证的主要交互，之后系统才可删除被替换的旧 JSX、样式和状态代码

### Requirement: 旧壳层与视觉组件退役
系统 SHALL 在新应用壳层通过跨角色和响应式验证后，删除旧横向导航、旧全局操作包装和确认无人引用的旧动画组件。

#### Scenario: 新壳层已验证
- **WHEN** `ConsoleShell` 已在管理员、普通用户、桌面、平板、手机和既有深链中通过验证
- **THEN** 系统 MUST 删除或迁移后删除旧 `TopNav`、`HeaderActions`、`ThemeToggle`、`ThemeScript` 和旧 `AnimatedThemeToggler` 包装实现，使其不再被活跃前端引用

#### Scenario: 动画组件无人引用
- **WHEN** 全仓引用审计确认 `text-3d-flip.tsx`、`morphing-text.tsx`、`dia-text-reveal.tsx` 或其他候选组件没有活跃导入
- **THEN** 系统 MUST 删除这些组件及其专属样式和依赖

### Requirement: 遗留样式和页面结构清理
系统 SHALL 在所有使用者完成 token 迁移后删除旧页面包装、棕色径向背景、强制 dark 覆盖和未使用样式补丁，且不得破坏已迁移路由的构建或视觉行为。

#### Scenario: 删除遗留全局样式
- **WHEN** 旧全局样式规则已没有活跃页面或组件依赖
- **THEN** 系统 MUST 删除该规则，并通过前端构建和已迁移路由的 smoke test

#### Scenario: 仍存在未迁移使用者
- **WHEN** 引用审计发现旧样式或页面包装仍被未迁移实现使用
- **THEN** 系统 MUST 保留该规则直到使用者完成替换，而不得进行全局盲删

### Requirement: 本地存储命名空间迁移与清理
系统 SHALL 将主题、认证、图像会话和可编辑文件历史从旧 `chatgpt2api` 命名空间迁移到 Uni2API 命名空间，且 MUST 在成功写入新存储后才删除旧数据。

#### Scenario: 成功迁移旧数据
- **WHEN** 用户存在旧主题、认证会话、图像会话或可编辑文件历史数据
- **THEN** 系统 SHALL 读取旧数据、写入等价的新命名空间、验证写入成功并删除旧数据，且用户主题、会话和草稿保持可用

#### Scenario: 存储迁移失败
- **WHEN** 新命名空间写入或验证失败
- **THEN** 系统 MUST 保留旧数据、继续以旧数据初始化相关功能，并不得清除用户会话或草稿

### Requirement: 兼容性例外审计
系统 SHALL 将用户可见品牌和前端存储键与兼容性边界分开审计，且不得用全局文本替换修改未经批准的兼容值。

#### Scenario: 执行品牌残留检查
- **WHEN** 实施者搜索前端中的历史名称
- **THEN** 系统 SHALL 删除用户可见的旧品牌和已迁移的存储键，同时保留文档化例外中的上游仓库 URL、WebDAV 路径、兼容 API 示例和调试 Skill 标识
