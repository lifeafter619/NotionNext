# 2026-08-06 修复批次验证与合并后扫描

## 文档状态

- 审查基线：`main`，合并提交 `6f384809`（upstream/main 合入）+ 工作区 AUD-001～012 修复批次
- 审查方式：安全关键文件逐行人工审查 + 两个并行代理覆盖 149 个主题/组件改动文件（Babel 语法解析 + 语义 diff 审查）
- 运行验证：完整 Jest `171` suites/`808` tests 通过、ESLint `0` error（229 个既有 warning）、`tsc --noEmit` 通过
- 前序文档：`2026-08-05-static-code-and-performance-review.md`（AUD-001～012 原始审计）

## 结论

本批次（194 修改 + 12 新增文件）**可以提交**。扫描发现 1 个真实 bug（已修复）、2 个既有遗留项（非本批回归，见"遗留观察"）、2 个架构性权衡（见"须知"）。

## 发现并修复

### FIX-001：`components/Player.js` 把数值枚举当布尔解析

- 严重度：Medium（功能回归）
- 发现于：本次扫描（代理审查）
- 问题：AUD-012 修复把 `JSON.parse(siteConfig('MUSIC_PLAYER_LRC_TYPE'))` 统一替换为 `siteConfigBoolean(...)`，但 `MUSIC_PLAYER_LRC_TYPE` 是 APlayer 的数值枚举（`0` 禁用 / `1` 歌词字符串 / `3` 歌词文件 url，见 `conf/widget.config.js:23`）。`siteConfigBoolean('3')` 返回 `true`，APlayer 对 `lrcType` 做严格数值比较，配置 `3` 或 `1` 的用户升级后歌词会静默失效。
- 修复：改回数值解析并保留容错——`Number(siteConfig('MUSIC_PLAYER_LRC_TYPE', 0)) || 0`，非数值输入回退为 `0`（禁用歌词），不会再因 `JSON.parse` 崩溃。
- 状态：已修复（本提交内），ESLint 通过。

## 安全关键文件复核（逐行）

| 文件 | 结论 |
| --- | --- |
| `pages/api/unlock-post.js`（新） | OK。POST-only；postId 正则 `/^[a-f\d-]{32,36}$/i`；密码 1–1024 字符；`timingSafeEqual` 比较 `sha256(password)` 与旧版 `md5(slug+password)`；先取数后校验（200 前不外发任何内容）；成功响应 `delete post.password` + `Cache-Control: private, no-store`；找不到文章与密码错误同返 403，无枚举 oracle |
| `pages/api/webhook-proxy.js` | OK。动作白名单（`NOTION_WEBHOOK_ACTIONS` 服务端环境变量，客户端只发 `actionId+payload`）；Origin/Referer 同源校验；SSRF 全防护：协议白名单、禁 URL 凭证、本地主机名拒绝、IPv4/IPv6 私网段拒绝、DNS 解析后逐地址复查并 pinning 到已验证 IP（防 DNS rebinding）、Host/SNI 正确传递；header 黑名单；256kb body / 1mb 响应上限；10s 超时；响应体不外发 |
| `pages/api/auth/notion/start.js`（新） | OK。GET-only；env 缺失 500；32 字节随机 state 写 HttpOnly + SameSite=Lax + 生产 Secure + 10 分钟 TTL Cookie 后 302 |
| `pages/api/auth/callback/notion.ts` | OK。收敛为兼容跳转：白名单参数（code/state/error/error_description）307 转发到 `/auth`，token 交换只有一处实现，state 校验无法分叉（AUD-011） |
| `pages/auth/index.js` | OK。`consumeOAuthState` 用 `timingSafeEqual` 校验且一次性消费；错误日志不含响应体；重定向固定 `/auth/result`，query 仅白名单字段，不回传 access_token，无开放重定向；msg 以 React 文本渲染，无 XSS |
| `pages/api/visitor-location.js`（新） | OK。GET-only；`BAIDU_MAP_AK` 仅服务端；`isIP` 校验、`::ffff:` 归一化；4s AbortController 超时；仅返回 city；no-store |
| `pages/api/notion-comments.js` | OK。payload 长度上限 + 邮箱校验 + website 蜜罐（静默假成功）；独立 IP 限流（默认 5 次/分钟，惰性清理防 Map 膨胀）；父评论校验防跨文章挂回复；展示名用昵称或邮箱前缀，不暴露完整邮箱 |
| `lib/db/notion/cleanBlockMapForClient.js` | OK。剥离 role/permissions/用户元数据；删除未引用 automation 记录；`stripWebhookActionSecrets` 把 send_webhook/http_request 动作削减为 id+type（webhook URL/密钥不再下发）；可推导 signed_url 剔除；compact/restore 对称 |
| `lib/db/SiteDataApi.js` | OK。`cleanPostForClient` 对加密文章 `password=true` 并剥离 `blockMap/toc`（AUD-001 核心）；`includeProtectedContent` 仅服务端解锁接口使用；`allLinkPages` 按 `navShortIds` 去重避免双份序列化（AUD-006） |
| `lib/notionImageMeta.js`（新） | OK。先 `restoreCompactBlockMapForRender` 再遍历，兼容 compact 形态；visited 集合防环 |
| `proxy.ts` | OK。UUID 重定向挪到 Clerk 包装之外（AUD-008），fetch 失败重置缓存 promise；公共页缓存头按部署目标分层（浏览器 5min / Vercel CDN 24h / Cloudflare 5min 防旧构建白屏）；api/auth 等路径不缓存 |
| `pages/search/index.js` + `pages/search/page/[page].js`（新） | OK。构建期写 `public/search-index.<locale>.json`（文件名消毒；**加密文章剔除正文**）；props 不再内嵌全文（AUD-005）；客户端仅在有搜索词时懒取，`cancelled` 清理完整；静态导出搜索 404 修复（AUD-003） |
| `components/NotionComments.js` | OK。服务端游标分页替换"全量下载再切片"（AUD-007）；按请求键防竞态；id 去重 |
| `components/NotionPage.js` | OK。图片元数据抽取到 `lib/notionImageMeta.js`；`prioritizeFirst` 仅主文章首图 eager，避免多实例争抢 |

## 主题批次复核（代理，149 文件）

- 24 个 ArticleLock/PostLock 组件：统一 `async submitPassword` + `await validPassword` + `void` 包裹调用；`validPassword` 整段 try/catch 永不 reject，无 unhandled rejection、无 UI 卡死；错误提示各主题均保留。
- 20 个 SearchInput/Header：路径式 `/search/${key}` 统一改查询式 `?s=`，特殊字符不再丢失；旧路由保留向后兼容。
- 约 50 个文件 86 处 `/category/` 链接全部 `encodeURIComponent`（AUD-010）；改后全仓无未编码 category href。
- 20 个主题的延迟 404 定时器全部有 `clearTimeout`（AUD-009）；movie/photo 顺带把既有视频合并定时器也纳入清理。
- `themes/theme.js` 的 `fixThemeDOM` 整体移除（AUD-004），无悬挂引用。
- 全部 149 文件 Babel 语法解析通过；`git diff --check` 干净。

## 须知（架构性权衡，非 bug）

1. **静态导出站点无法解锁加密文章**：`EXPORT=true` 时没有 `/api/unlock-post`，`validPassword` 恒返回 false。这是密码校验服务端化（AUD-001）的固有代价——安全与纯静态不可兼得。
2. **`/api/unlock-post` 无频率限制**：可在线爆破（每分钟请求数不受限）。缓解因素：密码 hash 已不下发（无法离线爆破）；无枚举 oracle；Notion 数据源本身有速率上限。建议后续接入 `lib/middleware/security.js` 的 `rateLimitMiddleware` 或边缘层限流。
3. heo 右侧栏挂件改为 idle 后客户端挂载（`SideRightDeferred`），不再出现在 SSR HTML——有意的性能取舍，对 SEO 影响轻微。

## 遗留观察（改动前就存在，非本批回归）

1. 8 处 `/tag/${...}` 链接未编码（claude/movie/photo/simple/typography 的 ArticleInfo、BlogItem、ArticleFooter），与 AUD-010 同类但本次范围仅覆盖 category。
2. `themes/game/index.js`、`themes/commerce/index.js` 的 Layout404"3 秒跳首页"定时器无清理（commerce 的 useEffect 还缺依赖数组）。

## 合并质量记录

- 合并提交 `6f384809`：8 个冲突文件人工解决（PrismMac.js 三方语义合并、prism-mac-style.css 全文重写、ShareButtons.js 保 HEAD 类名体系、matery ArticleLock/JumpToComment 取上游 + 本地 async、文档取上游、getPostBlocks.test.js 双侧保留）。
- 合并后先于本地改动恢复前验证：166 suites/768 tests 通过；恢复本地改动后 171 suites/808 tests 通过（本地新增 5 suites/40 tests）。
