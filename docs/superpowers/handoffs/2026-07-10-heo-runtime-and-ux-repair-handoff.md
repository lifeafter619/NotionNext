# HEO 运行时与体验修复交接文档

## 当前状态

- 日期：2026-07-10
- 实施分支：`fix/heo-runtime-ux-repair`
- 隔离工作区：`D:\Project\NotionNext\.worktrees\heo-runtime-ux-repair`
- 当前 HEAD：`aaa35d2c fix: reset article search and deferred content state`
- 工作树：干净，无未提交生产代码或 Task 6 半成品。
- 最新用户要求：后续不要使用子 Agent，直接在当前会话/主代理内继续。

规格和计划：

- `docs/superpowers/specs/2026-07-10-heo-runtime-and-ux-repair-design.md`
- `docs/superpowers/plans/2026-07-10-heo-runtime-and-ux-repair.md`

## 必须保持的产品约束

- 不重写 HEO，不进行视觉重设计。
- 保留公开 URL、稳定 DOM 类名和用户自定义 CSS 兼容性。
- 配置优先级保持不变，只修复假值判断。
- 访客 IP 属地在通用组件中必须安全默认关闭。
- 本项目必须在 `themes/heo/config.js` 中显式设置 `HEO_VISITOR_LOCATION_ENABLE: true`，保持开启。
- 后续实现继续使用 TDD：先看到正确 RED，再改生产代码并确认 GREEN。

## Worktree 测试注意事项

嵌套 Windows worktree 会让当前 `jest.config.js` 中带 `<rootDir>` 的 `testMatch` 解析为混合斜杠，直接运行 `npm test` 会显示 `No tests found`。这不是测试失败。

在该 worktree 中，每条 Jest 命令必须追加：

```powershell
--testMatch='**/__tests__/**/*.{js,jsx,ts,tsx}' --testPathIgnorePatterns='node_modules'
```

示例：

```powershell
npm test -- --runInBand __tests__/themes/heo/SearchResultJumpNavigation.test.js --testMatch='**/__tests__/**/*.{js,jsx,ts,tsx}' --testPathIgnorePatterns='node_modules'
```

Worktree 的 `node_modules` 是指向主工作区 `D:\Project\NotionNext\node_modules` 的 Junction，没有改动锁文件。

Git 可能输出以下无害警告：

```text
warning: unable to access 'C:\Users\lenovo/.config/git/ignore': Permission denied
```

## 已验证的基线

创建 worktree 后运行完整 Jest 基线：

```powershell
npm test -- --runInBand --testMatch='**/__tests__/**/*.{js,jsx,ts,tsx}' --testPathIgnorePatterns='node_modules'
```

结果：

- `108` 个测试套件通过。
- `431` 个测试通过。
- `0` 个失败。

该结果只代表实施前基线。Tasks 1–5 完成后尚未重新运行完整测试集，最终仍需执行 Task 16。

## 已完成任务

### Task 1：配置显式假值

提交：`40e8655e fix: preserve explicit falsey configuration values`

文件：

- `lib/config.js`
- `__tests__/lib/configFalseyValues.test.js`

结果：

- RED：`5 failed / 12 passed`，准确命中 Notion `false`、`0`、空字符串以及 Waline 别名覆盖。
- GREEN：`2` 个套件、`19` 个测试通过。
- 仅 `null`、`undefined` 被视为缺失。
- 已覆盖 Notion、兼容别名、extendConfig、BLOG 和 default。

非阻断审查备注：尚未为 THEME_CONFIG 的 `false`、`0`、空字符串增加直接参数化用例；当前实现语义正确，可在最终完善时补充。

### Task 2：LazyImage SSR/hydration 稳定

提交：`2cb9216a fix: stabilize lazy image hydration sources`

文件：

- `components/LazyImage.js`
- `__tests__/components/LazyImage.test.js`

结果：

- RED：服务端 `width=1080`、客户端窄视口 `width=480`，React 报告 `Prop 'src' did not match`。
- GREEN：`26/26` 通过。
- `adjustImgSize` 已变为纯函数，不读取 `window`、`document` 或 `screen`。
- 响应式 `srcSet` 仍包含 `320w`、`480w` 等候选。

非阻断审查备注：hydration 测试可进一步用“源 URL 宽度与目标 width 不同”的输入增强，证明参数重写本身没有被绕过。

### Task 3：LoadingProgress/NProgress

提交：

- `47ac7511 fix: initialize loading progress route handlers`
- `451e5906 fix: handle loading progress resource failures`

文件：

- `components/LoadingProgress.js`
- `__tests__/components/LoadingProgress.test.js`

结果：

- 首轮 RED：晚加载实例未被旧 handler 读取、`minimum` 拼写错误、卸载后仍继续资源工作。
- 审查补充 RED：JS/CSS Promise rejection 未处理，`2 failed / 4 passed`。
- 最终 GREEN：`6/6` 通过。
- 使用 ref 读取当前 NProgress 实例，on/off handler 身份对称。
- `settings.minimum = 0.1`。
- active 守卫阻止卸载后初始化。
- JS 和 CSS 加载失败均被吸收，不产生未处理 Promise rejection。

### Task 4：文章搜索关键字跨路由残留

包含在提交：`aaa35d2c fix: reset article search and deferred content state`

文件：

- `components/SearchHighlightNav.js`
- `__tests__/components/SearchHighlightNav.test.js`

结果：

- RED：导航到新 `asPath` 后旧浏览器事件关键字仍显示，`1 failed / 4 passed`。
- GREEN：`5/5` 通过。
- 路由变化时清空临时 `eventKeyword`，URL 当前关键字仍由路由派生。

### Task 5：评论和底部推荐生命周期

包含在提交：`aaa35d2c fix: reset article search and deferred content state`

文件：

- `components/Comment.js`
- `themes/heo/index.js`
- `__tests__/components/CommentLifecycle.test.js`
- `__tests__/themes/heo/LayoutResponsiveControls.test.js`

结果：

- RED：评论 provider 在文章 B 首次提交时仍沿用文章 A 的已加载状态；observer 未 disconnect；PostRecommend 在文章切换时仍保留。
- GREEN：两个套件共 `11/11` 通过。
- 评论状态改为 `loadedCommentId === articleId`。
- 推荐状态改为 `recommendedPostId === postIdentity`。
- 新文章首次 render 即为未加载状态，不等待 effect 重置。
- Comment cleanup 使用 `observer.disconnect()`。

当前有一条既有定向 lint warning：

```text
components/Comment.js:87 react-hooks/exhaustive-deps missing dependency: router
```

没有新增 lint error；最终扩展主题 lint 时应重新评估并处理。

## 当前下一步：Task 6

Task 6 尚未修改任何文件。中止前只读取了：

- `__tests__/themes/heo/SearchResultJumpNavigation.test.js`
- `themes/heo/index.js` 的搜索格式化和状态代码。

现有重要事实：

- 现有测试 `does not let stale Algolia responses replace the latest search results` 已在基线通过，说明当前 `isActive` cleanup 已防止常见乱序覆盖。不要为了凑修改量破坏这一行为。
- 当前错误路径在 `catch` 中执行 `setAlgoliaResults(null)`，随后会回退成本地/空结果 UI，无法区分服务错误与真正 `hits: []`。
- `formatDate` 仍使用 `date.toLocaleDateString()`，SSR/客户端 locale 和时区不稳定。

Task 6 应先在 `__tests__/themes/heo/SearchResultJumpNavigation.test.js` 增加 RED：

1. Algolia reject 时显示 `搜索服务暂时不可用，请稍后重试`，不显示 `未找到相关文章`。
2. `{ hits: [] }` 时显示正常空结果，不显示错误。
3. 跨 UTC 日期边界的时间按 `Asia/Shanghai` 输出固定 `YYYY-MM-DD`。
4. 清空 keyword 后，在途响应不得重新显示。

然后在 `themes/heo/index.js`：

- 明确区分 `idle/loading/success/empty/error`。
- 保留已有 stale-response 防护，或用 request generation 替换但必须让现有 stale 测试继续通过。
- 增加 retry 入口。
- 将日期固定为 `Asia/Shanghai` 的 `YYYY-MM-DD`，不能依赖环境默认 locale。

推荐先运行现有 stale 测试作为证据：

```powershell
npm test -- --runInBand __tests__/themes/heo/SearchResultJumpNavigation.test.js -t 'stale Algolia' --testMatch='**/__tests__/**/*.{js,jsx,ts,tsx}' --testPathIgnorePatterns='node_modules'
```

## 剩余任务概览

### Task 6：HEO 搜索状态和日期

- `themes/heo/index.js`
- `__tests__/themes/heo/SearchResultJumpNavigation.test.js`

### Task 7：受控搜索、Banner、Footer

- `themes/heo/components/SearchInput.js`
- `themes/heo/components/Footer.js`
- `themes/heo/index.js`
- `__tests__/themes/SearchInputNavigation.test.js`
- 新建 `__tests__/themes/heo/ConfigRendering.test.js`

### Task 8：Float TOC 观察实际目录

- `themes/heo/components/FloatTocButton.js`
- 可能修改 `themes/heo/components/Catalog.js`
- `__tests__/themes/heo/FloatTocButtonFallback.test.js`

### Task 9：相邻文章重复入口和 transform 清理

- `themes/heo/components/PostAdjacent.js`
- 新建 `__tests__/themes/heo/PostAdjacent.test.js`

### Task 10：阅读进度边界和标题

- `themes/heo/components/ReadingProgress.js`
- `themes/heo/components/Header.js`
- 新建 `__tests__/themes/heo/ReadingProgress.test.js`

### Task 11：访客属地隐私和 PV 文案

- `themes/heo/components/VisitorInfoCard.js`
- `themes/heo/config.js`
- `__tests__/themes/heo/VisitorInfoCardStorage.test.js`
- 通用默认关闭，本项目配置必须显式 `true`。

### Task 12：无封面卡片宽度

- `themes/heo/components/BlogPostCard.js`
- `__tests__/themes/heo/PostCoverFallback.test.js`

### Task 13：Swipe 和 SocialButton

- `themes/heo/components/Swipe.js`
- `themes/heo/components/SocialButton.js`
- `__tests__/themes/heo/SwipeExternalOpen.test.js`
- 新建 `__tests__/themes/heo/SocialButton.test.js`

### Task 14：合法 HTML、唯一正文 ID、Schema

- `themes/heo/components/Logo.js`
- `themes/heo/components/Announcement.js`
- `themes/heo/index.js`
- 新建 `__tests__/themes/heo/SemanticMarkup.test.js`
- 正文继续保留唯一 `id="notion-article"`。
- 删除 HEO `<article>` 的错误 Movie 微数据；`components/SEO.js` 继续作为唯一 BlogPosting JSON-LD 来源。

### Task 15：CSS/Tailwind/lint

- `themes/heo/style.js`：移除/替换 CSS 字符串中的 `//`。
- `DarkModeButton.js`：`hover: scale-*` → `hover:scale-*`。
- `InfoCard.js`：`transitaion-all` → `transition-all`。
- `PostHeader.js`：`font-sm` → `text-sm`。
- `PostAdjacent.js`：`h-18` → `min-h-[4.5rem]`。
- `package.json`：lint 和 lint:fix 加入 `themes`。
- 新建 `__tests__/themes/heo/StyleValidity.test.js`。

### Task 16：完整验证

必须实际运行并记录：

```powershell
npm test -- --runInBand --testMatch='**/__tests__/**/*.{js,jsx,ts,tsx}' --testPathIgnorePatterns='node_modules'
npm run lint
npm run type-check
npm run build
git diff --check
```

最终还要逐项核对规格 ID 01–26，并区分：

- 新增失败测试 → 修复 → 通过；
- 现有测试已证明无需生产修改。

## 恢复工作时的检查命令

```powershell
Set-Location 'D:\Project\NotionNext\.worktrees\heo-runtime-ux-repair'
git status --short --branch
git log -10 --oneline
npm test -- --runInBand __tests__/components/LoadingProgress.test.js __tests__/components/SearchHighlightNav.test.js __tests__/components/CommentLifecycle.test.js __tests__/themes/heo/LayoutResponsiveControls.test.js --testMatch='**/__tests__/**/*.{js,jsx,ts,tsx}' --testPathIgnorePatterns='node_modules'
```

预期分支 HEAD 起点：`aaa35d2c`，工作树应为空。
