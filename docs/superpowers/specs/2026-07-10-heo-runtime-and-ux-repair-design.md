# HEO 运行时与体验问题修复设计

## 背景

本次工作基于对整个仓库的静态审查，重点逐文件检查了 `themes/heo`。审查确认了 26 项会造成配置失效、状态残留、错误降级、服务端/客户端渲染不一致、移动端溢出、无障碍退化或语义错误的问题。

修复采用兼容优先策略：不重写 HEO，不改变主要视觉风格，不主动调整公开 URL、现有 DOM 类名或用户可覆盖的 CSS 约定。共享组件中的修复必须兼顾其他主题，但本规格只处理审查中已经确认、会直接影响 HEO 或公共运行时体验的问题。

## 目标

1. 修复已确认的 26 项问题，并为可回归行为补充自动化测试。
2. 让显式的 `false`、`0` 和空字符串配置不再被错误覆盖。
3. 让搜索、目录、评论、进度条和相邻文章等客户端状态在路由切换、错误和卸载时正确收敛。
4. 消除 HEO 中已确认的 hydration、重复 ID、错误 HTML、Schema 和无效 CSS/Tailwind 问题。
5. 将访客 IP 属地查询改为安全默认关闭，同时在本项目的 HEO 配置中明确保持开启。

## 非目标

- 不进行 HEO 视觉重设计或主题重写。
- 不更换搜索、评论、统计或图片基础服务。
- 不改变现有文章 URL、搜索 URL 参数、公开组件类名和主要布局结构。
- 不处理本轮静态审查没有证据支持的主观样式偏好。
- 不借机进行与这些根因无关的大规模重构。

## 兼容性约束

- 保留 HEO 的主要视觉层级、颜色、动效开关和响应式断点。
- 保留现有路由、查询参数和搜索结果跳转方式。
- 保留用户自定义 CSS 依赖的现有类名；只修正无效类或补充必要类。
- 配置优先级仍为 Notion 配置覆盖主题配置，再回退到默认配置，但判断“是否配置”必须基于 `undefined`/`null`，不能基于真假值。
- 访客属地查询只有在配置显式为 `true` 时才发起。本项目在 `themes/heo/config.js` 中设置 `HEO_VISITOR_LOCATION_ENABLE: true`，因此当前站点行为保持开启。

## 根因与修复分组

以下 26 个问题组是一对一的实施与验收清单。一个问题组可以包含同一根因下的多个表现，但不得在计划中遗漏或仅以“顺手修复”代替测试与验收。

| ID | 规格节 | 主要文件 | 目标行为 |
| --- | --- | --- | --- |
| 01 | A1 | `lib/config.js` | 保留显式假值配置 |
| 02 | A2 | `components/LazyImage.js` | 首次渲染图片 URL 稳定 |
| 03 | A3 | `components/LoadingProgress.js` | NProgress 延迟加载后可用并正确清理 |
| 04 | A4 | `components/SearchHighlightNav.js` | 搜索高亮不跨路由残留 |
| 05 | A5 | `components/Comment.js` | 评论隐藏状态随当前路由恢复 |
| 06 | A6 | `components/Comment.js`、`themes/heo/index.js` | 观察器和延迟任务不泄漏到新页面 |
| 07 | B1 | `themes/heo/index.js` | 旧 Algolia 响应不能覆盖新结果 |
| 08 | B2 | `themes/heo/index.js` | 搜索错误与真正空结果分离 |
| 09 | B3 | `themes/heo/index.js` | 搜索日期 SSR/客户端一致 |
| 10 | B4 | `themes/heo/components/SearchInput.js` | 外部关键字变化同步到输入框 |
| 11 | B5 | `themes/heo/components/FloatTocButton.js` | 只观察实际目录边界 |
| 12 | B6 | `themes/heo/components/PostAdjacent.js` | 单一响应式入口且手势样式可复位 |
| 13 | B7 | `ReadingProgress.js`、`Header.js` | 进度有界且标题可访问 |
| 14 | C1 | `themes/heo/components/VisitorInfoCard.js` | PV 文案不冒充今日独立读者数 |
| 15 | C2 | `VisitorInfoCard.js`、`themes/heo/config.js` | 属地查询可配置且本项目保持开启 |
| 16 | C3 | `themes/heo/index.js` | 首页 Banner 开关真正生效 |
| 17 | C4 | `themes/heo/components/Footer.js` | 备案链接服从配置 |
| 18 | C5 | `themes/heo/components/BlogPostCard.js` | 无封面卡片正文占满宽度 |
| 19 | C6 | `themes/heo/components/Swipe.js` | 链接目标正确且轮播可暂停 |
| 20 | C7 | `Logo.js`、`themes/heo/index.js` | Link/404 使用合法单一交互元素 |
| 21 | C8 | `themes/heo/components/SocialButton.js` | 窄屏不溢出且邮件链接有效 |
| 22 | C9 | `Announcement.js`、`components/NotionPage.js` | 正文 ID 唯一 |
| 23 | C10 | `themes/heo/index.js`、`components/SEO.js` | 不输出错误或重复文章 Schema |
| 24 | D1 | `themes/heo/style.js` | CSS 字符串只含合法注释 |
| 25 | D2 | 四个 HEO 组件 | 已确认的无效 Tailwind 类全部修正 |
| 26 | D3 | `package.json` | lint 覆盖 `themes/` |

### A. 公共运行时与服务端/客户端一致性

#### A1. 配置假值被吞

`lib/config.js` 使用逻辑或运算符合并配置源，并用真假值决定是否回退，导致合法的 `false`、`0` 和空字符串被主题值或默认值覆盖。

设计：增加统一的“已提供值”判断，按 Notion、主题、默认配置的既有优先级选择第一个非 `undefined`、非 `null` 的值。兼容别名也使用同一语义。空字符串保留为显式关闭或清空，而不是自动回退。

#### A2. `LazyImage` hydration URL 不一致

`components/LazyImage.js` 在服务端和首次客户端渲染时依赖不同的视口信息生成图片 URL，可能导致 hydration 属性不一致和图片二次请求。

设计：`adjustImgSize` 不再读取 `window`、`document` 或屏幕宽度，只根据图片自身 `width` 与 `IMAGE_COMPRESS_WIDTH` 生成稳定的最大候选 URL。浏览器端的响应式选择完全交给已有的 `srcSet` 与 `sizes`，挂载后不再为了视口宽度改写 `src`。这样服务端与客户端首次渲染一致，也避免 hydration 后二次请求。已有懒加载、错误占位和图片代理行为保持不变。

#### A3. NProgress 捕获初始空状态

`components/LoadingProgress.js` 的路由事件 effect 捕获初始 `null` 实例，且将 `minimum` 拼写为 `minimun`，导致事件处理器可能永久不可用，配置也不生效。

设计：资源加载完成后再绑定或通过稳定引用读取当前实例；统一解绑全部事件；使用 NProgress 的正确 `minimum` 配置字段。重复挂载不能重复注册监听器。

#### A4. 搜索高亮关键字跨路由残留

`components/SearchHighlightNav.js` 中事件关键字优先级最高，却未在路由变化时清空，导致离开一次搜索跳转后仍高亮旧词。

设计：将事件关键字限定为当前导航周期的临时覆盖值。路由路径或查询关键字改变时清除旧事件值，再从当前路由重新派生；已有匹配计数、上下跳转和清理逻辑保持不变。

#### A5. 评论隐藏状态不能可靠恢复

`components/Comment.js` 的隐藏状态可能从旧路由残留到新页面，导致配置允许评论时仍不可见。

设计：把评论可见性派生为当前路由和配置的确定状态；路由或评论配置变化时必须重新计算，并显式恢复应显示的容器。

#### A6. 观察器与延迟任务清理不完整

`components/Comment.js` 和 `themes/heo/index.js` 中的 MutationObserver、定时器或相关回调可能在依赖变化或卸载后继续工作。

设计：每次 effect 重跑或卸载时断开观察器、清除定时器和撤销事件监听；异步回调在写入 DOM 或状态前检查当前实例仍有效，禁止旧页面回调修改新页面状态。

### B. HEO 搜索、目录和导航状态

#### B1. Algolia 旧请求覆盖新结果

`themes/heo/index.js` 的异步搜索没有请求世代或取消保护，较慢的旧关键字响应可能覆盖较新的结果。

设计：为每次搜索分配递增请求标识，只有最后一次有效请求可以更新结果、加载态和错误态。清空关键字时立即清空结果并使所有在途请求失效。

#### B2. Algolia 错误被误判为“无结果”并触发降级跳转

当前错误路径与真正的空结果共用状态，可能把网络/服务错误当作无结果并自动降级到文章内搜索或其他跳转。

设计：搜索状态明确区分 `idle`、`loading`、`success`、`empty` 和 `error`。只有成功响应且结果为空时允许执行现有空结果降级；错误状态保留输入并展示可重试反馈，不自动改变页面位置。

#### B3. 搜索日期在 SSR 与客户端不稳定

`toLocaleDateString()` 依赖运行环境的地区和时区，服务端与浏览器可能输出不同文本。

设计：搜索结果日期统一输出 `YYYY-MM-DD`，按 `Asia/Shanghai` 时区取年月日；实现使用固定格式部件，不依赖环境默认 locale。示例：同一时间戳在服务端和客户端均输出 `2026-07-10`。无效日期继续输出空字符串。

#### B4. 搜索输入为不受控值

`themes/heo/components/SearchInput.js` 使用 `defaultValue`，外部关键字变化后输入框不更新。

设计：改为受控输入，值由当前关键字状态驱动；保留现有提交、清空、键盘操作和焦点行为。

#### B5. 浮动目录观察范围过大

`FloatTocButton` 观察整个 `sideRightSticky`，其他侧栏卡片的尺寸变化会错误影响目录按钮显示。

设计：观察实际目录容器或明确的目录可见哨兵，而不是整个粘性侧栏。目录不存在时沿用当前 fallback；观察目标变化和卸载时完整断开。

#### B6. 相邻文章重复 UI 与 transform 残留

`PostAdjacent` 在平板断点可能同时显示两套入口，且直接写入 DOM 的 transform 未在手势结束、断点变化或卸载时完整重置。

设计：确保任一断点只有一套交互入口可见；手势状态由组件生命周期管理，结束、取消、路由变化和卸载均恢复 transform。链接目标和卡片视觉保持不变。

#### B7. 阅读进度超界且标题未传递

`ReadingProgress` 未把百分比限制在 `0..100`，HEO Header 也没有传入可访问标题。

设计：对计算结果做有限数检查和边界限制；Header 传入当前文章标题或稳定的回退标签，供可访问名称和提示文本使用。

### C. HEO 内容、隐私与可访问性

#### C1. 访客统计文案错误

组件展示的是累计 PV，却称为“今天第 N 位读者”，会误导用户。

设计：文案改为与累计访问量一致的描述，不改变 Busuanzi 数据源和计数逻辑。不得伪装成日唯一访客数。

#### C2. 访客 IP 属地未经显式配置即请求

组件挂载后直接请求外部 IP API，用户无法通过配置控制隐私行为。

设计：新增 `HEO_VISITOR_LOCATION_ENABLE`。共享行为默认 `false`；只有严格等于 `true` 时请求 IP/属地服务。关闭时不发请求，保留当前位置行和图标以避免布局跳动，但固定显示“欢迎您的来访~”，不显示“加载中”、未知地区或任何推测位置。本项目 HEO 默认配置显式设为 `true`，保持当前项目开启。

#### C3. 首页 Banner 开关未生效

`HEO_HOME_BANNER_ENABLE` 已定义但 Hero 无条件渲染。

设计：首页 Hero 由该配置控制；关闭时不保留空白占位，后续内容自然上移。默认值保持 `true`。

#### C4. Footer 忽略备案链接

Footer 读取 `BEI_AN_LINK` 后仍使用硬编码地址。

设计：优先使用显式配置链接；缺失时采用项目现有安全回退。备案文字、打开方式和样式保持兼容。

#### C5. 无封面文章卡片仍保留封面宽度

`BlogPostCard` 在没有封面时仍对正文使用 `md:w-7/12`，造成内容区域异常狭窄。

设计：只有存在封面时使用分栏宽度；无封面时正文占满可用宽度。现有有封面布局不变。

#### C6. 轮播链接和自动播放不可控

`Swipe` 对所有链接强制 `_blank`，内部链接也新开标签；自动轮播缺少暂停机制。

设计：内部链接沿用站内导航语义，外部链接才使用安全的新标签属性；鼠标悬停、键盘聚焦以及用户偏好减少动态效果时暂停自动轮播，并在条件解除后安全恢复。

#### C7. 非法链接嵌套与错误的 `legacyBehavior`

Logo 使用 `legacyBehavior` 包裹 `div/img`，404 页面出现 `<a><button>` 交互元素嵌套，可能导致无效 HTML 和键盘/点击行为冲突。

设计：使用 Next Link 支持的单一可交互元素结构；404 链接直接承担按钮视觉，不嵌套原生 button。保留原类名和外观。

#### C8. 社交按钮移动端溢出与邮件无链接

固定排列在窄屏可能溢出，邮件项渲染 `<a>` 却没有 `href`。

设计：容器允许按现有视觉节奏换行或收缩；邮箱生成合法 `mailto:` 链接。无有效目标的项目不渲染空锚点。

#### C9. 重复 `id="notion-article"`

Announcement 与正文可能同时使用相同 ID，破坏 `getElementById`、目录、图片、代码高亮和广告选择器的确定性。

设计：正文继续保留唯一的 `notion-article` ID，因为多个共享组件依赖它；公告改用语义化的独立 ID 或 class。不得通过修改全部共享选择器来扩大变更范围。

#### C10. 结构化数据错误标记为 Movie

文章容器使用 `https://schema.org/Movie`，导致搜索引擎获得错误实体类型。

设计：`components/SEO.js` 已为文章页面输出 `BlogPosting` JSON-LD，因此从 HEO 的 `<article>` 移除错误的 `itemScope` 和 `itemType="https://schema.org/Movie"`，不再添加第二份微数据 Schema。保留现有 `<article id="article-wrapper">` 结构，由全局 SEO 组件作为唯一文章结构化数据来源。

### D. 样式、配置和质量门禁

#### D1. CSS 模板中使用无效 `//` 注释

`themes/heo/style.js` 的 CSS 字符串包含 JavaScript 风格注释，会让相邻声明存在解析风险。

设计：改为合法 CSS 注释或移除注释，不调整对应样式规则。

#### D2. 无效 Tailwind 类

已确认的无效类及替代语义如下：

- `DarkModeButton.js`：`hover: scale-100` 与 `hover: scale-50` 被空格拆成无效 `hover:` token；分别改为 `hover:scale-100` 和 `hover:scale-50`，恢复原作者表达的 hover 状态。
- `InfoCard.js`：`transitaion-all` 改为 `transition-all`。
- `PostHeader.js`：`font-sm` 改为文本尺寸类 `text-sm`。
- `PostAdjacent.js`：项目未定义的 `h-18` 改为 `min-h-[4.5rem]`，保持原目标高度同时允许长标题撑开。

设计：替换为当前 Tailwind 配置支持、语义等价的类；不引入新的设计 token 或断点。

#### D3. lint 未覆盖主题目录

`package.json` 的 lint 范围没有包含 `themes/`，主题问题难以及时被发现。

设计：扩展现有 lint 脚本或配置，使 `themes/**/*.{js,jsx,ts,tsx}` 纳入同一规则集。只处理本次变更触发或已确认的问题，不承诺一次性清理所有历史 lint 债务；若全主题存在既有阻断项，计划中应将基线与新增错误分开报告。

## 组件边界与数据流

### 配置读取

```text
Notion configuration
        |
        v
Theme configuration ----> first provided value ----> project defaults
                               |
                               v
                         consumer component
```

“provided”只排除 `undefined` 和 `null`。布尔 `false`、数字 `0` 和空字符串均为有效显式值。

### Algolia 状态

```text
keyword change -> request generation + 1 -> loading
      |                    |
      |                    +-> stale response: ignore
      |                    +-> latest success with hits: success
      |                    +-> latest success without hits: empty -> existing fallback
      |                    +-> latest failure: error -> retry feedback
      +-> empty keyword: idle + invalidate in-flight requests
```

### 访客属地

```text
HEO_VISITOR_LOCATION_ENABLE === true
      | yes                               | no / missing
      v                                   v
request external location API       no network request
      |
success -> show location
failure -> privacy-safe fallback
```

## 错误处理和清理规则

- 所有异步响应在写入状态前必须确认仍属于当前路由、当前关键字或当前挂载实例。
- 网络错误不得伪装为业务空结果。
- 外部 IP 服务失败不得阻塞卡片其余内容，也不得无限重试。
- 所有 `MutationObserver`、`ResizeObserver`、路由监听器、DOM 事件、动画帧和定时器必须在依赖变化与卸载时清理。
- DOM 查询必须依赖唯一、稳定的正文 ID；公告等辅助区域不得复用它。
- 仅在浏览器环境访问 `window`、`document`、storage 和视口信息。

## 测试策略

实施严格遵循 RED-GREEN-REFACTOR：每项生产代码修改前，先添加能稳定复现根因的最小失败测试并实际确认失败原因正确。

### 单元与组件测试

- `lib/config.js`：覆盖 Notion/主题/default 优先级，以及 `false`、`0`、空字符串、`null`、`undefined`。
- `LazyImage`：覆盖 SSR 与首次 hydration URL 稳定、挂载后响应式更新边界。
- `LoadingProgress`：覆盖延迟加载后事件绑定、正确 `minimum`、重复挂载和卸载清理。
- `SearchHighlightNav`：覆盖路由切换后事件关键字清空。
- HEO 搜索：覆盖乱序响应、清空关键字使请求失效、error 与 empty 分离、确定性日期。
- `FloatTocButton`：覆盖只观察目录目标以及目标/卸载清理。
- `VisitorInfoCard`：覆盖默认不请求、显式开启请求、失败回退和累计 PV 文案。
- HEO 配置：覆盖本项目 `HEO_VISITOR_LOCATION_ENABLE: true` 与 Banner 开关。
- 其余组件分别覆盖条件宽度、唯一 ID、合法链接结构、轮播暂停、邮件链接、进度边界和清理行为。

### 静态验证

- 使用 `rg` 确认 HEO CSS 模板中无无效 `//` 注释。
- 确认文档中列出的无效 Tailwind 类已清除。
- 确认页面渲染路径中只有一个 `id="notion-article"`。
- 确认文章 Schema 不再使用 `Movie`。
- 确认 lint 范围包含 `themes/`。

### 完整验证

在所有 TDD 小循环完成后运行：

1. 受影响 Jest 测试文件。
2. 完整 Jest 测试集。
3. lint，包括 `themes/`。
4. TypeScript/类型检查（若项目现有命令支持）。
5. Next.js 生产构建。

如果完整 lint 或构建暴露与本次变更无关的历史问题，必须明确区分“本次引入”和“既有基线”，不能把未通过描述为已通过。

## 预期修改范围

主要生产文件包括：

- `lib/config.js`
- `components/LazyImage.js`
- `components/LoadingProgress.js`
- `components/SearchHighlightNav.js`
- `components/Comment.js`
- `components/NotionPage.js`
- `themes/heo/config.js`
- `themes/heo/index.js`
- `themes/heo/style.js`
- `themes/heo/components/Announcement.js`
- `themes/heo/components/BlogPostCard.js`
- `themes/heo/components/DarkModeButton.js`
- `themes/heo/components/FloatTocButton.js`
- `themes/heo/components/Footer.js`
- `themes/heo/components/Header.js`
- `themes/heo/components/InfoCard.js`
- `themes/heo/components/Logo.js`
- `themes/heo/components/PostAdjacent.js`
- `themes/heo/components/PostHeader.js`
- `themes/heo/components/ReadingProgress.js`
- `themes/heo/components/SearchInput.js`
- `themes/heo/components/SocialButton.js`
- `themes/heo/components/Swipe.js`
- `themes/heo/components/VisitorInfoCard.js`
- `package.json`

测试优先扩展现有文件，只有现有测试边界不合适时才新建聚焦测试文件。

## 完成标准

- 26 项确认问题均有对应代码修复或明确证据证明不需修改。
- 所有可行为化的问题都有先失败、后通过的回归测试记录。
- 访客属地通用默认关闭，本项目配置显式开启，运行时不会因假值覆盖而失效。
- HEO 主要视觉、公开 URL、现有 DOM 类名和用户自定义 CSS 兼容性保持不变。
- 受影响测试、完整测试、lint、类型检查和生产构建的结果均被实际记录；任何剩余失败都有文件、命令和范围说明。
