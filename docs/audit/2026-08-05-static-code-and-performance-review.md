# 2026-08-05 静态代码与用户侧性能审查

## 文档状态

- 审查基线：`main`，提交 `01698efbf6788217ae129141dcfda9aebbc1770e`
- 审查方式：以静态调用链、数据流和主题实现对比为主
- 运行验证：定向 Jest `13` suites/`84` tests、完整 Jest `169` suites/`796` tests、TypeScript 检查、Lint、生产构建均通过；静态导出在 Windows 上被现有非法 slug `article/f**k` 的文件名限制中止
- 结论边界：本文记录的是已从源码确认的高置信问题，不代表项目不存在其他问题
- 修复状态：AUD-001～012 均已在当前工作区完成修复，未提交 commit
- 验证边界：未使用 WSL；Vercel/Linux 静态导出需在目标环境复核含保留字符 slug 的页面

## 摘要

| ID        | 严重度   | 类型        | 问题                                                 | 状态   |
| --------- | -------- | ----------- | ---------------------------------------------------- | ------ |
| `AUD-001` | Critical | 安全/功能   | 密码文章正文和密码摘要下发到浏览器                   | 已修复 |
| `AUD-002` | High     | 安全/滥用   | Webhook API 是无鉴权公共转发器，并可能暴露凭证       | 已修复 |
| `AUD-003` | High     | 功能        | 静态导出时普通搜索词和分页搜索 404                   | 已修复 |
| `AUD-004` | High     | 稳定性/UX   | 主题 DOM 清理可能删除 React 管理的整页节点           | 已修复 |
| `AUD-005` | Medium   | 性能        | 本地全文搜索把全站正文序列化进单个页面               | 已修复 |
| `AUD-006` | Medium   | 性能        | 文章页下发两份全站索引并执行无效链接扫描             | 已修复 |
| `AUD-007` | Medium   | 性能/UX     | 评论分页只隐藏已全量下载的数据                       | 已修复 |
| `AUD-008` | Medium   | 功能/性能   | UUID 重定向启用 Clerk 后失效，未启用时逐请求内部抓取 | 已修复 |
| `AUD-009` | Medium   | UX          | 多数主题未取消延迟 404 定时器                        | 已修复 |
| `AUD-010` | Medium   | 路由/UX     | 多数主题未编码分类 URL                               | 已修复 |
| `AUD-011` | Medium   | 安全/维护性 | Notion OAuth 回调缺少 `state`，且存在两套实现        | 已修复 |
| `AUD-012` | Low      | 配置/稳定性 | 布尔配置被二次 `JSON.parse`，常见输入可触发整页错误  | 已修复 |

## 建议处理顺序

1. 先处理 `AUD-001` 和 `AUD-002`，二者属于信任边界问题。
2. 再处理 `AUD-003` 和 `AUD-004`，二者会直接导致核心用户流程不可用或白屏。
3. 将 `AUD-005`、`AUD-006`、`AUD-007` 作为同一轮用户侧性能工作处理，并记录页面 JSON、请求量和移动端主线程耗时的前后对比。
4. 最后处理条件性路由、主题一致性和配置容错问题。

---

## AUD-001：密码文章正文和密码摘要下发到浏览器

- 严重度：Critical
- 置信度：高
- 状态：已修复
- 适用条件：文章配置了 `password`

### 源码证据

- `pages/[prefix]/index.js:36` 使用客户端 `lock` 状态隐藏正文。
- `pages/[prefix]/index.js:43` 至 `pages/[prefix]/index.js:54` 在浏览器中计算并比较密码摘要。
- `lib/db/SiteDataApi.js:567` 至 `lib/db/SiteDataApi.js:594` 无论文章是否加密都会抓取完整 `blockMap`。
- `lib/db/SiteDataApi.js:266` 至 `lib/db/SiteDataApi.js:278` 只删除派生的 `content`，没有删除加密文章的 `blockMap` 或 `password`。

### 用户影响

页面内容虽然在 UI 中被锁住，但正文已经存在于页面 HTML、`__NEXT_DATA__` 或 Next.js page-data JSON 中。访问者无需输入密码即可恢复正文，还可以取得密码摘要进行离线猜测。

### 根因

密码保护被实现为客户端显示控制，而不是服务端访问控制。客户端必须同时拿到正文和摘要才能完成当前校验，因此无法形成安全边界。

### 最小修复方向

1. 未通过服务端校验的请求不得返回 `blockMap`、正文文本或密码摘要。
2. 通过服务端接口、短期 HttpOnly 会话或签名令牌完成解锁。
3. 对 `EXPORT=true` 明确限制：纯静态文件无法提供真正的私密正文保护，应禁用该能力或在文档和 UI 中明确标记为“视觉锁”。

### 修复后验证

- 未解锁页面的 HTML 和 page-data JSON 中搜索不到正文片段、`blockMap` 及密码摘要。
- 正确密码可解锁，错误密码不可解锁。
- 刷新、直接访问和客户端路由跳转的行为一致。

### 修复记录

- 修复提交：未提交（当前工作区）
- 涉及文件：`lib/db/SiteDataApi.js`、`pages/[prefix]/index.js`、`pages/api/unlock-post.js`、各主题密码表单及对应定向测试
- 验证命令：`npx jest __tests__/pages/api/unlock-post.test.js __tests__/lib/db/SiteDataApiCacheSanitize.test.js --runInBand`
- 静态导出边界：受保护文章不再导出正文且保持锁定；纯静态部署不支持服务端解锁。

---

## AUD-002：Webhook API 是无鉴权公共转发器，并可能暴露凭证

- 严重度：High
- 置信度：高
- 状态：已修复
- 适用条件：部署环境提供 `/api/webhook-proxy`，或文章中使用 Notion Button webhook action

### 源码证据

- `pages/api/webhook-proxy.js:30` 的入口没有鉴权、来源绑定或限流。
- `pages/api/webhook-proxy.js:39` 接受调用者提供的任意公网 `url`、`payload` 和 `headers`。
- `pages/api/webhook-proxy.js:176` 的 header 清理允许 `Authorization` 等业务凭证继续发送。
- `components/NotionButton.js:53` 至 `components/NotionButton.js:62` 从浏览器向代理发送目标 URL、payload 和 action headers。
- `lib/db/notion/cleanBlockMapForClient.js:464` 至 `lib/db/notion/cleanBlockMapForClient.js:500` 将按钮引用的完整 automation/action 记录保留到客户端数据。

### 用户和运营影响

- 任意外部调用者都可借站点服务器向任意公网服务发送 POST 请求。
- 站点可能承担滥用流量、第三方 API 配额和封禁风险。
- 如果 Notion Button header 中含 Bearer Token 或 API Key，该值会随页面数据暴露给访问者。

### 已有防护及其边界

当前实现已有协议、私网 IP、DNS 解析和部分 DNS rebinding 防护。这能降低 SSRF 风险，但不能解决匿名转发、请求滥用或客户端凭证泄漏。

### 最小修复方向

不要让浏览器提交任意 URL 和敏感 header。服务端应按不可猜测的 action ID 查找服务端保存的目标与凭证，并增加目标域名白名单、请求鉴权和限流。无法迁移凭证前，至少禁止转发敏感 header，并默认关闭该 API。

### 修复后验证

- 匿名请求、未知 action ID 和非白名单目标均被拒绝。
- 页面数据和浏览器请求中不存在 webhook 凭证。
- 合法按钮仍能触发预先配置的服务端 action。

### 修复记录

- 修复提交：未提交（当前工作区）
- 涉及文件：`pages/api/webhook-proxy.js`、`components/NotionButton.js`、`lib/db/notion/cleanBlockMapForClient.js` 及对应测试
- 验证命令：`npx jest __tests__/pages/api/webhook-proxy.test.js __tests__/components/NotionButton.test.js __tests__/lib/db/notion/cleanBlockMapForClient.test.js --runInBand`
- 配置边界：服务端通过 `NOTION_WEBHOOK_ACTIONS` JSON 映射保存目标 URL/凭证；未配置 action 默认拒绝。

---

## AUD-003：静态导出时普通搜索词和分页搜索 404

- 严重度：High
- 置信度：高
- 状态：已修复
- 适用条件：`EXPORT=true` 的纯静态部署

### 源码证据

- `pages/search/[keyword]/index.js:66` 只预生成关键词 `NotionNext`。
- `pages/search/[keyword]/index.js:67` 在静态导出时设置 `fallback: false`。
- `pages/search/[keyword]/page/[page].js:79` 不预生成任何分页路径，并在静态导出时同样关闭 fallback。
- 至少 18 个主题把搜索框提交到 `/search/${encodeURIComponent(keyword)}`，例如 `themes/starter/components/SearchInput.js:27`、`themes/hexo/components/SearchInput.js:25` 和 `themes/heo/components/SearchInput.js:37`。

### 用户影响

在 Cloudflare Pages 等静态部署中，除固定占位词外，用户输入正常关键词会直接到达不存在的 HTML 文件并得到 404。分页搜索也不可用。

### 最小修复方向

统一搜索入口。不要直接把所有主题切到当前的 `/search?s=` 后就结束，因为该页面还存在 `AUD-005` 的大 payload 问题。优先生成紧凑搜索索引并在首次搜索时按需加载，再让静态部署统一走 `/search?s=`。

### 修复后验证

- 主题导航定向测试覆盖中文、空格、`/`、`?`、`#`，统一产生 `{ pathname: '/search', query: { s } }`。
- `/search` 页面及 `/search/page/[page]` 已改为静态入口；分页路径由 `getStaticPaths` 按文章数量生成，搜索词不再作为文件路径。
- Windows `npm run export` 已生成 `.next/export/search.json`，但随后因既有文章 slug `article/f**k` 无法创建 Windows 文件名而中止；分页最终文件未能在该次导出中落盘，需在 Vercel/Linux 复核。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`pages/search/index.js`、`pages/search/page/[page].js`、各主题 `SearchInput`/搜索导航组件及对应导航测试。
- 定向验证：`npx jest __tests__/pages/searchIndex.test.js __tests__/themes/SearchInputNavigation.test.js __tests__/themes/HeaderSearchKeywordNavigation.test.js --runInBand`。
- 适用边界：纯静态部署需要实际导出所有分页文件；现有数据中的 Windows 保留字符 slug 是独立的构建环境限制，不属于查询参数路由逻辑。

---

## AUD-004：主题 DOM 清理可能删除 React 管理的整页节点

- 严重度：High
- 置信度：高
- 状态：已修复
- 适用条件：出现嵌套的同名 `theme-*` 节点，尤其是 starter、landing、proxio 的文章重定向分支

### 源码证据

- `pages/_app.js:118` 通过主题 `LayoutBase` 渲染外层主题容器。
- `themes/theme.js:146` 查找所有 `[id^="theme-"]` 节点。
- `themes/theme.js:148` 至 `themes/theme.js:158` 保留最后一个节点并直接 `removeChild` 删除其他节点。
- `themes/starter/index.js:74` 渲染外层 `theme-starter`，而重定向分支在 `themes/starter/index.js:168` 再渲染同名内层节点。landing 和 proxio 存在相同结构。

### 用户影响

内层节点位于外层节点内部。删除外层时，所谓“保留”的内层节点也会一起脱离文档，可能造成白屏、不可交互页面、滚动跳动和后续 React 更新异常。

### 最小修复方向

删除命令式 DOM 清理，让 React 通过组件树和 `key` 管理主题切换。重定向加载态不应再创建同名主题根节点；如确需标记，使用不同的 class 或 `data-*` 属性。

### 修复后验证

- 已移除 `themes/theme.js` 中对 React 管理节点的命令式删除逻辑；主题切换交由 React 树管理。
- 静态一致性测试覆盖 starter、landing、proxio 的重复主题根节点风险。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`themes/theme.js`、重定向/加载态相关主题组件及 `__tests__/themes/auditConsistency.test.js`。
- 定向验证：`npx jest __tests__/themes/auditConsistency.test.js --runInBand`。
- 适用边界：未进行真实浏览器控制台回归；生产部署仍应观察 hydration/DOM ownership 警告。

---

## AUD-005：本地全文搜索把全站正文序列化进单个页面

- 严重度：Medium
- 置信度：高
- 状态：已修复
- 类型：用户侧加载性能

### 源码证据

- `pages/search/index.js:104` 收集所有已发布 Post/Page。
- `pages/search/index.js:133` 至 `pages/search/index.js:203` 构建时读取每篇公开文章的全文。
- `pages/search/index.js:212` 至 `pages/search/index.js:230` 把正文放入 `props.posts[].content`。
- `pages/search/index.js:61` 在浏览器主线程遍历全部文章和正文进行过滤。

### 用户影响

文章数量和正文长度会线性放大 `/search` 的 HTML/page-data JSON、下载时间、JSON 解析、内存占用和搜索输入响应时间。低端手机和慢网最明显。

密码文章正文已经在该路径中被排除，这部分处理正确。

### 最小修复方向

将紧凑搜索索引拆成独立静态资源，在用户首次打开搜索时加载。索引只保留检索需要的字段和归一化文本；已有 Algolia 配置时直接使用远程索引。设定压缩后体积预算，避免索引继续无上限增长。

### 修复后验证

- 当前生成的 `.next/export/search.json` 为 `67,883` bytes，`pageProps.posts` 不含 `content`；独立 `public/search-index.default.json` 为 `248,809` bytes。
- 索引包含 33 条记录，其中 32 条有正文文本，1 条为密码文章且 `content: null`；索引不含 `password` 或 `blockMap` 字段。
- 搜索索引只在实际存在关键词时通过 `fetch` 首次加载；无关键词打开 `/search` 不请求索引。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`pages/search/index.js`、`lib/utils/notion.util.js`（record-map 解包复用）、`.gitignore` 及搜索测试。
- 定向验证：`npx jest __tests__/pages/searchIndex.test.js __tests__/lib/db/notion/getPageContentText.test.js --runInBand`。
- 适用边界：索引体积随公开正文线性增长；当前实现只解决首屏 payload，仍需在大站点上设置压缩体积预算和真实移动端指标。

---

## AUD-006：文章页下发两份全站索引并执行无效链接扫描

- 严重度：Medium
- 置信度：高
- 状态：已修复
- 类型：用户侧加载与主线程性能

### 源码证据

- `lib/db/SiteDataApi.js:294` 至 `lib/db/SiteDataApi.js:300` 在文章详情 props 中同时保留 `allNavPages` 和 `allLinkPages`。
- 两份列表都随文章数线性增长，且字段明显重叠。
- `components/ExternalPlugins.js:214` 至 `components/ExternalPlugins.js:219` 在水合后延迟执行 `convertInnerUrl`。
- `lib/db/notion/convertInnerUrl.js:15` 扫描正文链接，并在 `lib/db/notion/convertInnerUrl.js:32` 对每个 Notion 链接线性查找全站列表。
- `lib/db/notion/convertInnerUrl.js:54` 至 `lib/db/notion/convertInnerUrl.js:60` 又执行一次 `链接数 × 页面数` 查找，但查询结果完全没有被使用。

### 用户影响

每篇文章都承担两份全站元数据的下载和解析成本；长文章与大站点还会在水合后产生额外主线程扫描。成本随文章数持续增长，而不是随当前页面内容保持稳定。

### 最小修复方向

1. 直接删除 `convertInnerUrl` 中无副作用的第二轮循环。
2. 将两份映射合并为按需字段，例如单份 `short_id -> href` 表。
3. 主题确实需要全站导航时再下发导航字段；其他详情页只下发链接转换所需映射。

### 修复后验证

- `allNavPages` 仅保留 Post 导航字段，`allLinkPages` 仅保留 Page 内链字段，不再重复下发同一批 Post。
- `convertInnerUrl` 预建 `short_id -> page` 的 `Map`，并删除无副作用的第二轮 `链接数 × 页面数` 扫描。
- 本次部分静态导出中的文章 page-data 为约 `28–55 KB`；未建立 100/1000 篇的同数据集前后基准。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`lib/db/SiteDataApi.js`、`lib/db/notion/convertInnerUrl.js` 及对应测试。
- 定向验证：`npx jest __tests__/lib/db/SiteDataApiCacheSanitize.test.js __tests__/lib/db/notion/convertInnerUrl.test.js --runInBand`。
- 适用边界：主题仍需要 Post 导航和独立 Page 内链映射，因此两份不同用途的小字段列表仍会存在。

---

## AUD-007：评论分页只隐藏已全量下载的数据

- 严重度：Medium
- 置信度：高
- 状态：已修复
- 适用条件：启用 Notion 评论，单篇文章评论较多

### 源码证据

- `pages/api/notion-comments.js:65` 至 `pages/api/notion-comments.js:88` 使用 `page_size: 100` 循环读取该文章所有评论。
- `pages/api/notion-comments.js:114` 一次性把全部评论返回浏览器。
- `components/NotionComments.js:87` 的分页仅通过 `slice(0, visibleRootCount)` 隐藏本地数组。

### 用户影响

打开评论区时会产生多次 Notion API 查询并下载完整评论树，即使用户只看前十条。热门文章会出现更长等待、更高 API 配额消耗和更多客户端内存占用。

### 最小修复方向

API 提供真实 cursor 分页。先返回根评论页和必要的回复计数；用户展开回复或点击“加载更多”时再请求后续数据。提交评论前的数据库 schema 可短期缓存，避免每次重复读取。

### 修复后验证

- 根评论 API 使用 `cursor`/`pageSize` 查询并返回 `nextCursor`，单次最大页大小限制为 50。
- 回复按 `parentId` 首次展开后再加载；根评论和各回复链分别隔离请求序号、去重、错误和重试状态。
- 提交根评论或回复后只刷新对应层级，避免重新下载整棵评论树。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`pages/api/notion-comments.js`、`components/NotionComments.js`、`__tests__/pages/api/notion-comments.test.js`。
- 定向验证：`npx jest __tests__/pages/api/notion-comments.test.js __tests__/lib/plugins/notionComments.test.js --runInBand`。
- 适用边界：回复计数基于已加载树；如需显示未加载的精确总回复数，需要在 Notion 数据模型中额外维护计数。

---

## AUD-008：UUID 重定向启用 Clerk 后失效，未启用时逐请求内部抓取

- 严重度：Medium
- 置信度：高
- 状态：已修复
- 适用条件：启用 `UUID_REDIRECT`

### 源码证据

- `proxy.ts:94` 至 `proxy.ts:119` 只在 `noAuthProxy` 中执行 UUID 重定向。
- `proxy.ts:124` 至 `proxy.ts:147` 配置 Clerk 后选择完全独立的 `clerkMiddleware` 分支，该分支没有 UUID 重定向逻辑。
- 未启用 Clerk 时，`proxy.ts:99` 对每个匹配请求都通过同源 HTTP 获取 `/redirect.json`。

### 用户影响

- 同时启用 Clerk 与 UUID 重定向时，旧 UUID 链接不再跳转到文章 slug。
- 未启用 Clerk 时，每个请求增加一次边缘到同源的内部网络往返，直接增加 TTFB，并把静态资源故障扩大到所有匹配请求。

### 最小修复方向

将 UUID 重定向放到鉴权分支选择之前，确保两个分支共用。重定向映射应在模块生命周期内缓存，或在构建阶段生成可由 middleware 直接读取的映射，避免逐请求同源 fetch。

### 修复后验证

- UUID 检测和重定向已放在 Clerk/无 Clerk 分支之前，两种鉴权配置共用同一逻辑。
- `redirect.json` 映射使用模块级 Promise/结果缓存；非 UUID 请求不会发起映射请求。
- 静态一致性测试检查分支顺序、缓存和非 UUID 快速路径。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`proxy.ts`、`__tests__/themes/auditConsistency.test.js`。
- 定向验证：`npx jest __tests__/themes/auditConsistency.test.js --runInBand`。
- 适用边界：未在真实 Clerk 边缘运行时测量 TTFB；首次 UUID 请求仍需加载一次映射。

---

## AUD-009：多数主题未取消延迟 404 定时器

- 严重度：Medium
- 置信度：高
- 状态：已修复
- 适用条件：文章暂未找到，且用户在默认等待时间内离开当前页面

### 源码证据

- `themes/fukasawa/index.js:140` 至 `themes/fukasawa/index.js:153` 启动延迟 404 定时器但不返回 cleanup。
- 至少 16 个包含 `POST_WAITING_TIME_FOR_404` 的主题文件完全没有 `clearTimeout`。
- `themes/heo/index.js:1038` 至 `themes/heo/index.js:1048` 已展示正确模式：保存 timer 并在 effect cleanup 中取消。

### 用户影响

用户在等待期间导航到首页或其他非文章页面后，旧组件的定时器仍会执行。如果新页面不存在 `#article-wrapper #notion-article`，用户会被意外送到 `/404`。

### 最小修复方向

复用 heo 的现有模式，为每个定时器返回 `clearTimeout` cleanup。更进一步可把重复的“等待后判定 404”逻辑收敛到共享 hook，避免 20 个主题继续分叉。

### 修复后验证

- 20 个主题的延迟 404 effect 均保存 timer 并在 cleanup 中 `clearTimeout`。
- movie/photo 主题额外清理视频聚合 timer，避免卸载后继续更新或跳转。
- 静态一致性测试扫描所有主题的 `POST_WAITING_TIME_FOR_404` 用法及 cleanup。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：各主题 `index.js`，以及 movie/photo 的视频聚合逻辑和 `__tests__/themes/auditConsistency.test.js`。
- 定向验证：`npx jest __tests__/themes/auditConsistency.test.js --runInBand`。
- 适用边界：未执行真实浏览器计时导航回归；React 测试和静态扫描用于覆盖卸载清理约束。

---

## AUD-010：多数主题未编码分类 URL

- 严重度：Medium
- 置信度：高
- 状态：已修复
- 适用条件：分类名包含 `/`、`?`、`#`、空格或其他保留字符

### 源码证据

- `themes/starter/index.js:420`、`themes/next/index.js:413`、`themes/hexo/index.js:394` 等大量主题直接拼接 `/category/${category.name}`。
- `themes/heo/index.js:1231` 和 `themes/heo/index.js:1279` 已正确使用 `encodeURIComponent(category.name)`。

### 用户影响

例如 `AI/ML` 会变成两个路径段，`C#` 的井号部分会成为 fragment，带问号的分类会被解释为查询参数，最终到达错误分类或 404。

### 最小修复方向

复用一个已有或最小的分类路径生成函数，在所有主题统一编码一次。不要只修分类索引页，还要覆盖侧栏、卡片、页脚和搜索导航中的分类链接。

### 修复后验证

- 所有动态分类链接在拼接路径段时统一使用 `encodeURIComponent`。
- 静态一致性测试扫描主题源码，禁止新增未编码的 `/category/${...}` 模式。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：20 个主题的分类卡片、侧栏、导航、页脚及分页组件，`__tests__/themes/auditConsistency.test.js`。
- 定向验证：`npx jest __tests__/themes/auditConsistency.test.js --runInBand`。
- 适用边界：路由接收端仍依赖 Next.js 对参数解码；双重预编码的外部数据不在本次修复范围内。

---

## AUD-011：Notion OAuth 回调缺少 `state`，且存在两套实现

- 严重度：Medium
- 置信度：高
- 状态：已修复
- 适用条件：启用 Notion OAuth 集成

### 源码证据

- `pages/auth/index.js:14` 只读取 `code`，随后在 `pages/auth/index.js:68` 直接兑换 token。
- `pages/api/auth/callback/notion.ts:54` 和 `pages/api/auth/callback/notion.ts:108` 存在另一套相同流程。
- 仓库内没有 OAuth 发起端的随机 `state` 生成、存储和回调比较逻辑。

### 用户影响

回调无法证明授权响应属于当前浏览器发起的流程，存在登录 CSRF 或授权串线风险。两套 token exchange 还会造成错误处理和安全修复分叉。

### 最小修复方向

保留一个回调入口。发起授权时生成密码学随机 `state`，保存到短期 HttpOnly、Secure、SameSite cookie 或服务端会话；回调必须常量时间比较并在使用后删除。

### 修复后验证

- `/api/auth/notion/start` 使用密码学随机值生成 `state`，写入短期 HttpOnly、SameSite Cookie 后再跳转 Notion。
- `/auth` 使用常量时间比较并立即清除 state Cookie；缺失或错误 state 拒绝兑换。
- 旧 API 回调只做白名单参数转发，token 兑换逻辑只保留一套；重定向查询和日志不携带 token。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`pages/api/auth/notion/start.js`、`pages/auth/index.js`、`pages/api/auth/callback/notion.ts`、`lib/db/notion/oauth.js` 及 OAuth 测试。
- 定向验证：`npx jest __tests__/pages/api/notion-oauth.test.js __tests__/lib/db/notion/oauth.test.js --runInBand`。
- 适用边界：Cookie 的 `Secure` 属性随生产 HTTPS 环境启用；跨站反向代理必须保留正确协议头。

---

## AUD-012：布尔配置被二次 JSON.parse，常见输入可触发整页错误

- 严重度：Low
- 置信度：高
- 状态：已修复
- 适用条件：Notion 配置表使用 `yes`、`on`、`no`、`off` 等非 JSON 布尔文本

### 源码证据

- `lib/config.js:135` 的 `convertVal` 只转换字符串 `true` 和 `false`，其他普通字符串原样返回。
- `components/Player.js:12` 至 `components/Player.js:15`、`components/ShareBar.js:15`、`themes/hexo/index.js:128` 等约 25 个文件再次执行 `JSON.parse(siteConfig(...))`。
- `lib/global.js:44` 已明确说明 Notion 配置常出现 `yes/on`，并为 `REDIRECT_LANG` 单独实现宽松判断以避免整站白屏。

### 用户影响

配置表中看似合理的布尔文本会在组件渲染阶段抛出 `SyntaxError`，最终进入全局错误页。不同配置项对同一输入的解释也不一致。

### 最小修复方向

增加共享的布尔配置读取函数，在知道字段是布尔类型时统一处理 `true/false/1/0/yes/no/on/off`。不要把 `convertVal` 对所有任意字符串都改成布尔转换，以免标题或正文配置恰好为 `on` 时被误转换。删除调用方的二次 `JSON.parse`。

### 修复后验证

- 新增 `siteConfigBoolean`，统一支持 `true/false/1/0/yes/no/on/off`，未知值回退到默认值。
- 已删除源码中所有 `JSON.parse(siteConfig(...))` 调用，避免渲染期解析异常。
- 参数化测试覆盖真假值、大小写、空白和未知值回退，并由完整测试覆盖调用方。

### 修复记录

- 修复提交：未提交（当前工作区）。
- 涉及文件：`lib/config.js`、Player、ShareBar、主题开关调用点和 `__tests__/lib/configFalseyValues.test.js`。
- 定向验证：`npx jest __tests__/lib/configFalseyValues.test.js --runInBand`，并执行 `rg -n "JSON\\.parse\\(siteConfig" pages components lib hooks themes` 确认零命中。
- 适用边界：仅显式布尔配置使用 `siteConfigBoolean`；普通字符串配置仍保持原值，避免把合法文本 `on` 误转为布尔值。

---

## 已检查且未列为问题的部分

- 图片和 Notion 文件代理已有协议、私网地址、DNS、重定向和响应中断保护。
- 图片组件已有响应式 `srcset`、尺寸、首图优先级和原生懒加载；后台图片预取默认关闭并尊重弱网/省流设置。
- 主题和多数可选插件已经动态分块或延迟加载。
- Web Font 和 Font Awesome 已采用子集化及延迟激活策略。
- 通用分页工具对非法页码和越界已有保护。
- Notion 瞬时失败不会直接污染长期数据缓存。
- 多语言静态导出的已知限制属于当前文档明确声明的能力边界，本轮不重复记为缺陷。

## 后续维护规则

每修复一个条目时：

1. 将摘要表和条目内状态改为“处理中”或“已修复”。
2. 在条目下记录修复提交、涉及文件和验证命令。
3. 性能条目必须记录修复前后数据，不能只根据代码行数判断优化成功。
4. 若复核证明条目不成立，标记为“已关闭”，并写明反证，不直接删除历史记录。
