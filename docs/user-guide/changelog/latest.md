# 最新版本与更新日志

> 当前主线：**4.10.4**（见根目录 `package.json`）

## 4.10.4 发布要点

本版本补齐 Notion 2026 年新增 HTML Block 的渲染支持，让 Notion AI 生成或用户上传的 `.html` 小工具可以在 NotionNext 文章中直接展示。

### Notion HTML Block

- 支持 Notion HTML Block 在 API 中返回的 `embed + html_artifact` 数据结构。
- 为 HTML artifact 附件补齐 Notion signed URL，并保留原始 `attachment:` source，避免被 URL 清理逻辑误替换。
- 由于 Notion HTML 附件会返回 `Content-Disposition: attachment` 和严格 CSP，本版本会在服务端读取 HTML 内容，再通过 sandbox iframe 的 `srcDoc` 渲染。
- HTML Block 运行在 iframe 隔离环境中，不直接注入站点正文 DOM，降低对主题样式和站点脚本的影响。
- 限制单个 HTML artifact 最大 512KB，避免把过大的 HTML 文件塞入页面数据。

### 适用场景

- Notion AI 生成的房贷计算器、ROI 计算器、互动表单、轻量图表等前端小工具。
- 用户上传单文件 HTML artifact，并希望在文章正文中内嵌展示。
- 普通外部网页 Embed 仍按原有 iframe 方式渲染。

### 升级说明

- 正常升级无需新增环境变量。
- 修改 Notion HTML Block 内容后，如本地预览仍显示旧内容，可清理 NotionNext 缓存或关闭开发缓存后重新访问。

### 验证

- `yarn lint --file components/NotionPage.js --file lib/db/notion/getPostBlocks.js`：通过（保留原有 hook dependency warning）。
- `node -e "const p=require('./package.json'); if (p.version !== '4.10.4') process.exit(1)"`：通过。
- `yarn docs:site:build`：通过。

## 4.10.3 发布要点

本版本重点优化 Magzine 主题、字体资源、构建缓存和 Notion 数据过滤，并合入社区站数据库、视图筛选、Heo / Fuwari / Hexo / Matery 主题体验与依赖安全更新。

### 性能与资源加载

- 优化 Magzine 首页首屏图片加载策略，减少 LCP 图片延迟。
- 调整 Magzine 首页图片、广告位与文章卡片布局，降低图片、广告和卡片内容加载时的布局抖动。
- Font Awesome 样式改为延后加载，并在用户有交互意图后再加载，减少首屏阻塞。
- 预留 Font Awesome 图标布局空间，修复延迟加载期间图标可见性和页面跳动问题。
- 将 Font Awesome 字体文件改为本地自托管，减少第三方字体 CDN 依赖。
- Web Font 仅在配置启用时加载，未配置自定义字体的站点不再请求额外字体资源。

### Notion 数据与构建稳定性

- 稳定本地构建缓存文件锁，降低并发构建或重复读取缓存时的异常风险。
- 优化 filtered collection 数据处理，减少无关 Notion collection 数据进入页面数据。
- 保留空的 selected view 结果，避免空集合视图被误判为缺失数据。
- 增加 typed collection helper，统一集合数据读取路径。

### 主题与配置

- Fuwari 主题首次渲染时正确应用主题色相，并补充主题切换稳定性调整。
- Heo 信息卡 greeting 逻辑归一化，避免不同配置路径显示不一致。
- Hexo / Matery 主题新增 greeting words speed 配置，可控制首页问候语切换速度。
- 新增社区站数据库模板文档，补充 Notion 社区站点搭建入口。

### 文档与部署

- 文档站首页和导航加入最近更新提示能力，方便维护者发现新 changelog 与重要文档更新。
- 更新 Cloudflare Pages V3 build image 迁移说明。
- 更新开发者首页、愿景路线图与性能优化计划，记录本轮性能优化和后续维护方向。

### 依赖更新

- `axios` 升级到 `1.17.0`。
- `@vercel/functions` 升级到 `3.6.2`。
- `ioredis` 升级到 `5.11.1`。
- `@supabase/supabase-js` 升级到 `2.107.0`。

### 参与者

- [@tangly1024](https://github.com/tangly1024)：33 个提交。
- [@qianzhu](https://github.com/qianzhu) / Lucien：6 个提交。
- [@dependabot](https://github.com/dependabot)：4 个提交。
- [@88lin](https://github.com/88lin)：1 个提交。
- [@expoli](https://github.com/expoli)：1 个提交。
- [@githubdudu](https://github.com/githubdudu)：1 个提交。

### 提交范围

从 `v4.10.2` 到 `v4.10.3`：

- `5a1017a7` fix: filter embedded Notion collection views
- `6ec30f99` chore(release): bump package.json to 4.10.1
- `9c793e3c` fix: handle sync_block with content ID array
- `782a35bf` fix: render quote blocks without properties.title
- `6b24adc9` fix: respect view-level filters in database page resolution
- `f837e3d9` fix: apply Fuwari theme hue on initial render
- `1a6b2263` fix: preserve giscus oauth callback token
- `8f685096` docs: surface changelog unread updates
- `1aeac547` merge: release v4.10.2 hotfix
- `ee1043ee` fix: limit docs unread dots to sidebar
- `a0c9970c` fix: mark latest docs unread in sidebar
- `2eee510d` fix: record docs reads for every route
- `07ccff5b` fix: render sidebar unread dots as nodes
- `3815bda6` fix: keep sidebar unread leaf dots visible
- `302feebb` fix: normalize Heo infocard greetings
- `5252770e` refactor: add typed collection helpers
- `61b8c774` docs: add community site database template
- `4fb658be` fix: preserve empty selected view results
- `88e03cc1` chore: bump @supabase/supabase-js to 2.107.0
- `e747d117` chore: bump ioredis to 5.11.1
- `8e11d730` chore: bump @vercel/functions to 3.6.2
- `186b3e3a` chore: bump axios to 1.17.0
- `9922643f` Optimize Font Awesome stylesheet loading
- `3abb4a83` Merge Font Awesome loading optimization
- `35f332d5` Improve magzine homepage performance
- `6ccd2b86` Merge magzine homepage performance improvements
- `560d04e2` Optimize magzine LCP image loading
- `c9373041` Merge magzine LCP image optimization
- `1e34875b` Stabilize build cache locks and filtered collection data
- `7d431f12` Merge build cache stability updates
- `cb4c065d` docs: add Cloudflare Pages V3 build image migration
- `941cf310` Improve magzine image and ad layout stability
- `e3d91b9e` Merge magzine image layout stability
- `a9525fff` Defer Font Awesome from critical path
- `f96fecd5` Merge Font Awesome critical path deferral
- `2362c9c2` Load web fonts only when configured
- `8d783e33` Merge deferred web font loading
- `ff2c5073` Load Font Awesome after user intent
- `8da1cf29` Merge Font Awesome intent loader
- `1e4e2de4` Reserve Font Awesome icon layout
- `33ad83bf` Merge Font Awesome layout reservation
- `2a1dda67` Fix delayed Font Awesome visibility
- `ad5e32b2` Merge Font Awesome visibility fix
- `df71ae22` Self-host Font Awesome for menu icons
- `256a2363` Merge self-hosted Font Awesome performance fix
- `512524a7` feat: add configurable greeting words speed

### 适用场景

- 使用 Magzine、Fuwari、Heo、Hexo 或 Matery 主题的站点。
- 希望减少 Font Awesome / Web Font 对首屏渲染影响的站点。
- 使用 Notion collection view、Cloudflare Pages 或依赖构建缓存的站点。

### 升级说明

- 正常升级无需新增环境变量。
- 如果站点依赖 Font Awesome 图标，请升级后确认图标显示正常。
- 如果使用自定义 Web Font，请确认相关字体配置仍按预期启用。
- 如果使用 Hexo / Matery 主题，可按需配置 greeting words speed。

### 验证

- `git diff --check`：通过。
- `node -e "const p=require('./package.json'); if (p.version !== '4.10.3') process.exit(1)"`：通过。
- `yarn docs:site:build`：通过。

## 如何升级

- 站长升级：见 [版本升级指引](../update.md)。
- 构建性能与 Notion API 限流：见 [构建性能与 Notion API 限流](../deploy/build-tuning.md)。
- GitHub Release：[NotionNext Releases](https://github.com/notionnext-org/NotionNext/releases)。

## 历史版本全文

- [V4 历史](./v4-history.md)
- 源站：https://docs.tangly1024.com/article/latest
