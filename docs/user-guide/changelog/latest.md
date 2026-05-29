# 最新版本与更新日志

> 当前主线：**4.9.5.7**（见根目录 `package.json`）

## 4.9.5.7 发布要点

### 新增

- 社区 / 组织官网数据层：新增 `Member`、`Event` 类型，可在主题中消费 `allMembers` 与 `allEvents`。
- Member 数据支持通过 Notion 官方 API 补充读取，适用于非官方 API 视图结果不完整的场景。

### 修复

- 修复 Notion 数据库只应使用所选视图筛选结果的问题，避免其他视图的隐藏条目混入页面列表。
- 修复 Font Awesome `fa-x-twitter` 图标加载问题。
- 修复 Endspace 主题自定义多级菜单支持。
- 修复 Docker 构建未严格使用 `yarn.lock`、PR 多架构构建耗时过长等 CI 问题。

### 安全与依赖

- 合并 Dependabot patch 更新：`@supabase/supabase-js`、`@clerk/localizations`、开发依赖组等。
- 通过 Yarn resolutions 收敛多个传递依赖到已修复版本，包括 `qs`、`tmp`、`js-cookie`、`uuid`、`lodash`、`picomatch`、`flatted`、`esbuild`。

### 维护

- 恢复 lint / type-check / 单测 / Docker / VitePress 等 CI 基线。
- 修复主分支自动版本号 workflow 在受保护分支下直接失败的问题。
- 版本号已同步到 `4.9.5.7`。

## 4.9.5.x 近期要点（相对旧版文档）

| 领域 | 变化 |
| --- | --- |
| **组织与仓库** | 主仓库迁至 [notionnext-org/NotionNext](https://github.com/notionnext-org/NotionNext) |
| **主题** | 新增 **ThoughtLite**；Endspace 支持自定义多级菜单；主题切换 manifest 与预览图规范 |
| **社区官网** | 新增 `Member` / `Event` 数据类型输出：`allMembers`、`allEvents`；支持官方 Notion API 补充成员数据 |
| **Notion** | 数据源/集合解析兼容；保留所选 Notion 视图筛选结果；外部媒体（含 **Apple Music** 嵌入）规范化 |
| **构建** | `staticPaths` 缓存与导出稳定性；不可写缓存目录时回退 tmp；多站点 `NOTION_PAGE_ID` 构建期 `ENAMETOOLONG` 修复；Docker PR 构建范围收敛并使用 `yarn.lock` |
| **评论** | Notion Config 支持 **WALINE_*** 键名 |
| **置顶** | 全局 **TOP_TAG** 多置顶排序 |
| **安全** | 文章密码 **SHA256**（兼容旧 md5） |
| **依赖安全** | 修复 / 收敛 `qs`、`tmp`、`js-cookie`、`uuid`、`lodash`、`picomatch`、`flatted`、`esbuild` 等安全依赖告警 |
| **图标** | Font Awesome 默认 CDN 升级，修复 `fa-x-twitter` 图标不可用问题 |
| **CI / 发版** | 恢复 lint/type-check 基线；版本号自动 bump 改为推送维护分支，兼容受保护 `main` |
| **文档** | 仓库内 `docs/user-guide/` 用户手册、`DEPLOYMENT.md`、维护哲学文档；EdgeOne Node 版本与 ENOSPC 排错文档 |

完整提交见 [GitHub Releases](https://github.com/notionnext-org/NotionNext/releases)。

## 如何升级

- 站长：[update.md](../update.md)
- 开发者：[UPDATE.md（GitHub）](https://github.com/notionnext-org/NotionNext/blob/main/docs/developer/UPDATE.md)

## 历史版本全文

- [v4-history.md](./v4-history.md)（索引）
- 源站：https://docs.tangly1024.com/article/v4.0

## 原文链接

https://docs.tangly1024.com/article/latest
