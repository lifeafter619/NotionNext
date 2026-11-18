# Heo 主题归档 / 标签 / 分类页面品牌统一重构 — 设计文档

日期：2026-08-07
状态：已获用户批准（方向 A：Heo 品牌统一重构）

## 背景与问题

Heo 主题的设计语言为：主色 indigo `#4f65f0`（hover `#4f46e5`），暗色模式点缀金黄 `#ca8a04`；白色 `rounded-xl` 卡片 + hover 描边；`#f7f9fe` 浅灰蓝背景 —— 干净、扁平、无杂色。

但三个索引页严重偏离该语言：

- `/archive`（`LayoutArchive`）：仅一个白卡片 + CategoryBar + 按 `yyyy-MM` 分组的朴素列表，无页头、无统计、无视觉层次。
- `/category`（`LayoutCategoryIndex`）：蓝紫渐变 Banner + 文件夹图标 + 硬编码颜色（`blue-500`/`purple-600`/`#1e1e1e`），完全脱离主色体系。
- `/tag`（`LayoutTagIndex`）：翠绿/青色渐变 Banner + 渐变标签云，与 indigo/金黄体系冲突。

用户要求：风格统一、现代化、好看、**加载快、整体体验好**。

## 目标

1. 三个页面视觉语言与 Heo 首页/文章页完全一致（颜色、卡片、圆角、hover、动画）。
2. 保留用户确认的全部交互功能：标签云交互预览、分类页文章预览、归档页统计信息、归档时间线。
3. 性能：不引入新依赖；图片全部走现有 `LazyImage` 懒加载；归档页不加载封面图；分类卡片封面使用缩略图 + 精确 `sizes`。
4. 亮/暗两种模式均有良好表现；移动端响应式。

## 非目标

- 不改动数据层（`pages/archive`、`pages/tag`、`pages/category` 的 `getStaticProps` 均不变）。
- 不改动标签/分类**详情页**（`/tag/xxx`、`/category/xxx` 使用文章列表布局，不在本次范围）。
- 不改动 `config.js`，不新增站点配置项。
- 不做与本次无关的重构。

## 统一设计语言（三页共用）

### 颜色纪律

一律复用 `themes/heo/style.js` 已映射的工具类与 CSS 变量：

| 用途 | 亮色 | 暗色 |
|---|---|---|
| 主高亮（文字/图标/实心 pill） | `text-indigo-600` / `bg-indigo-600`（映射 `--heo-color-primary-hover`） | `dark:text-yellow-600` / `dark:bg-yellow-600`（映射 `--heo-color-accent`） |
| 卡片 hover 描边 | `hover:border-[var(--heo-color-border)]` | `dark:hover:border-[var(--heo-color-border-dark)]` |
| 卡片底 | `bg-white`（映射 `--heo-color-card`） | `dark:bg-[#1e1e1e]`（映射 `--heo-color-card-dark`） |
| 次级底（徽章/pill/chip） | `bg-[#f1f3f8]`（映射 `--heo-color-card-muted`） | `dark:bg-gray-800` |
| 次级文字 | `text-gray-600`（映射次级文字色） | `dark:text-gray-400` |

**禁止**再出现 `blue-*`/`purple-*`/`emerald-*`/`teal-*` 等杂色及 `bg-gradient-to-r from-*` 彩色渐变 Banner。允许的唯一渐变：封面图上的黑色遮罩（`from-black/60 to-transparent` 一类中性遮罩）。

### 新组件 `PageHeaderCard.js`

三页共用的页头卡片，替换现有渐变 Banner：

- 容器：`rounded-xl border bg-white dark:bg-[#1e1e1e] dark:border-gray-600 p-6 mb-4` + hover 描边主色 + `wow fadeInUp`。
- 左侧图标徽章：`w-12 h-12 rounded-lg bg-[#f1f3f8] dark:bg-gray-800` 方块，内部 FontAwesome 图标用主色（亮 indigo / 暗金黄）。扁平、无渐变。
- 中间：标题 `text-2xl font-extrabold`，副标题统计行 `text-sm text-gray-600 dark:text-gray-400`。
- Props：`icon`（FA class 字符串）、`title`、`subtitle`（节点或字符串）。保持无业务逻辑。

## 页面设计

### 1. `/archive`（LayoutArchive）

数据来源（现有 props，无需改数据层）：`archivePosts`（key 为 `yyyy-MM`，按日期倒序）、`categoryOptions`、`tagOptions`。

- **页头**：`PageHeaderCard`，icon `fas fa-archive`，标题 `locale.NAV.ARCHIVE`（「归档」），副标题 `共 N 篇文章 · X 个分类 · Y 个标签`（N = archivePosts 各组长度之和，X/Y 来自 options 长度）。
- **保留 CategoryBar**（`border={false}` 现状不变）—— Heo 归档页标志性元素。
- **归档时间线**：新组件 `ArchiveTimeline.js`（替代并删除 `BlogPostArchive.js`，已确认仅此处使用）：
  - 客户端将 `yyyy-MM` key 归并为年份分组（保持倒序）。
  - 年份区块头：大号年份 `text-3xl font-extrabold` 主色 + 该年文章数 pill（muted 底 `rounded-full`）。
  - 时间线：左侧竖线（`border-l`）+ 每篇文章一个圆点节点（主色边框小圆点，hover 实心并放大），条目内容：`MM-dd` 次要色日期（`text-sm`，不使用等宽字体）、标题 `font-bold`（hover 主色）、分类 chip（muted 小 pill，点击进分类页）。
  - 条目整行 hover：muted 圆角背景过渡（`transition-colors`）。
  - **不显示封面图**：归档是快速导航场景，零图片请求，保证加载速度。

### 2. `/category`（LayoutCategoryIndex）

数据来源：`categoryOptions`（含 `count`）、`categoryPreviewPosts` / `allPages` fallback。

- **页头**：`PageHeaderCard`，icon `fas fa-folder-open`，标题「分类」，副标题「共 N 个分类」。
- **分类卡片网格**：`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`（移动端 2 列保证可读性）。
  - 取该分类预览文章列表中**第一篇有封面的文章**的 `pageCoverThumbnail` 作卡底封面；封面用 `LazyImage`（`sizes='(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw'`，仅前 4 张 `priority`）。
  - 有封面：封面 + 中性黑色渐变遮罩（`bg-gradient-to-t from-black/70 via-black/20 to-transparent`），白字显示分类名（`font-extrabold`）+「N 篇文章」。
  - 无封面：`bg-[#f1f3f8] dark:bg-gray-800` 底 + 主色 `fa-folder` 图标 + 深色文字。
  - 卡片：`rounded-xl overflow-hidden border`、hover 描边主色 + 封面 `scale-105` + `hover:shadow-lg`、`wow fadeInUp`。
  - 整个卡片为 `SmartLink` 指向 `/category/<name>`。
- **每分类最新文章预览**（保留，每分类 4 篇）：
  - 区块白卡片头部：分类名 `text-xl font-extrabold` + 数量 pill（muted 底）+ 右侧「查看全部 →」主色**文字链接**（替换原蓝色实心按钮）。
  - `CategoryPostCard` 重构样式：横向布局保留（封面 `heo-post-cover` 比例 `w-full md:w-64`），标题 hover 主色（亮 indigo / 暗金黄），元信息用次级色；移除 blue/purple 相关类。预览区封面全部走 `LazyImage` 懒加载，不设置 `priority`（页首网格已占用 priority 名额）。
- 空分类（无已发布文章）不渲染区块（现状保留）。

### 3. `/tag`（LayoutTagIndex）

数据来源：`tagOptions`（含 `count`）、`tagPreviewPostsByTag` / `allPages` fallback。

- **页头**：`PageHeaderCard`，icon `fas fa-tags`，标题「标签」，副标题「共 N 个标签」。
- **标签云卡片**：白卡片内统一尺寸 pill（取消按文章数的字号阶梯 —— 现代化处理）：
  - pill：`rounded-full px-3 py-1.5 text-sm`、`bg-[#f1f3f8] dark:bg-gray-800`、`#名称` + 数量上标（`sup` 次要色）。
  - 按文章数降序排列。
  - hover：描边主色；选中：实心主色白字（暗色金黄）+ `scale-105`。
  - 点击选中/再点取消（保留现有交互），驱动下方预览。
- **选中标签预览**（保留）：2 列网格（`grid-cols-1 md:grid-cols-2`）竖版文章卡；头部显示选中 pill + 「查看全部 →」主色文字链接。
- **热门标签分组**（保留 top 10 × 3 篇）：区块头部 Heo 化（标签名 + 数量 pill + 主色文字链接），`TagPostCard` 重构样式：竖版封面卡（`heo-post-cover` 比例、封面 hover `scale-105`、标题 hover 主色、边框 hover 主色），移除 emerald/teal 类。
- 标签云与分组区块的卡片入场沿用 `wow fadeInUp`。

## 文件改动

| 操作 | 文件 |
|---|---|
| 新增 | `themes/heo/components/PageHeaderCard.js` |
| 新增 | `themes/heo/components/ArchiveTimeline.js` |
| 删除 | `themes/heo/components/BlogPostArchive.js`（仅 LayoutArchive 使用，已被替代） |
| 重构 | `themes/heo/index.js`：`LayoutArchive`、`LayoutCategoryIndex`、`LayoutTagIndex`、`CategoryPostCard`、`TagPostCard` 的 JSX 与样式 |

不改动：`pages/*`、`lib/*`、`config.js`、`style.js`（现有变量映射已够用）、其他布局。

## 性能预算

- 新增请求数：`/archive` = 0 张图；`/category`、`/tag` 封面图全部懒加载，`priority` 图片每页 ≤ 4 张。
- 不新增 npm 依赖；动画复用已加载的 wow.js；不引入新的 web font。
- 三个页面的渲染均为纯静态 props 计算（无新增客户端 fetch；标签云预览为客户端内存过滤，现状已如此）。

## 错误与边界处理

- `archivePosts`/`categoryOptions`/`tagOptions`/预览文章为 null/undefined/非数组时按现有 safe 模式降级为空，页面不崩溃（沿用现有防御式写法）。
- 分类无封面文章时卡片降级为 muted + 图标样式。
- 标签全部无文章时仅显示标签云，不渲染空分组。
- 长分类名/长标签名 `truncate`；时间线条目标题 `line-clamp-1` 防换行溢出（移动端允许 `line-clamp-2`）。
- 文案沿用现有 locale key（`COMMON.CATEGORY`/`COMMON.TAGS`/`MENU.ARCHIVE` 等），统计短语（「篇文章」「查看全部」等）沿用页面现有硬编码中文风格，与现状保持一致。

## 测试与验证

1. `npm run dev` 启动，目测三页面：亮色/暗色切换、移动端（375px）/桌面（1440px）响应式。
2. 标签云点选/取消、分类卡片跳转、归档时间线锚点（`#yyyy-MM` hash 滚动逻辑在 `pages/archive/index.js`，时间线年份/月份节点需保留对应 `id`）。
3. `npm run lint`（或项目既有检查）与生产构建通过。

## 风险

- **锚点兼容**：`pages/archive/index.js` 支持 `#yyyy-MM` hash 滚动；`ArchiveTimeline` 的月份分组节点必须保留 `id={archiveTitle}`（yyyy-MM），否则锚点失效。设计已纳入。
- **封面缺失站点**：分类卡片大量降级为 muted 样式时仍须美观 —— 通过主色图标 + 排版保证。
