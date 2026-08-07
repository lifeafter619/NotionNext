# Heo 主题归档/标签/分类页面品牌统一重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Heo 主题的 `/archive`、`/category`、`/tag` 三个索引页重构为统一的品牌设计语言（indigo 主色 / 暗色金黄、白卡片、扁平无杂色渐变），并实现归档时间线、分类封面网格、统一 pill 标签云。

**Architecture:** 新增两个展示组件（`PageHeaderCard`、`ArchiveTimeline`），重构 `themes/heo/index.js` 中三个 Layout 与两张文章卡片（`CategoryPostCard`、`TagPostCard`）的样式；删除被替代的 `BlogPostArchive.js`。不触碰数据层与配置。

**Tech Stack:** Next.js + React + TailwindCSS（项目无组件测试设施，测试循环 = eslint + 生产构建 + dev 目测）。

**Spec:** `docs/superpowers/specs/2026-08-07-heo-archive-tag-category-redesign-design.md`

## Global Constraints

- 颜色只允许使用 Heo 变量与 style.js 已映射的工具类：
  - 主色/高亮：`text-[var(--heo-color-primary)]`、`bg-[var(--heo-color-primary)]`、`border-[var(--heo-color-border)]`；暗色对应 `dark:...-[var(--heo-color-accent)]` / `dark:hover:border-[var(--heo-color-border-dark)]`
  - 实心 pill/徽章：`bg-indigo-600 dark:bg-yellow-600`（自动映射主色 hover/金黄 accent）+ `text-white`（映射 `--heo-color-primary-text`）
  - 卡片底：`bg-white dark:bg-[#1e1e1e]`；次级底：`bg-[#f1f3f8] dark:bg-gray-800`；中性 chip：`bg-black/5 dark:bg-white/10`
  - **禁止** `blue-*`/`purple-*`/`emerald-*`/`teal-*`/`from-blue-*`/`from-emerald-*` 等杂色；唯一允许的渐变是封面上的中性黑遮罩 `bg-gradient-to-t from-black/70 via-black/20 to-transparent`
- 不新增 npm 依赖；不改动 `pages/*`、`lib/*`、`themes/heo/config.js`、`themes/heo/style.js`
- 归档时间线必须保留 `#yyyy-MM` 锚点 id（`pages/archive/index.js` 的 hash 滚动依赖）
- 图片一律走 `LazyImage`；`/category` 网格封面仅前 4 张 `priority`，其余懒加载；`/archive` 不渲染任何封面
- 所有数据访问沿用现有防御式写法（null/非数组降级为空），页面不得因脏数据崩溃
- 每个任务结束运行 `npx eslint <改动文件>` 通过并 commit
- 文案沿用现有硬编码中文风格与 locale key（`locale.NAV.ARCHIVE`、`locale.COMMON.CATEGORY`、`locale.COMMON.TAGS`）

---

### Task 1: PageHeaderCard 共用页头组件

**Files:**
- Create: `themes/heo/components/PageHeaderCard.js`

**Interfaces:**
- Produces: `PageHeaderCard`（default export），props：`{ icon: string, title: ReactNode, subtitle?: ReactNode }`。Task 3/4/5 的三个 Layout 均消费它。

- [ ] **Step 1: 创建组件**

```jsx
/**
 * Heo 索引页共用页头卡片（归档/分类/标签）
 * 设计语言：白卡片 + 扁平图标徽章（muted 底 + 主色图标）+ 大标题 + 统计副标题
 * @param {object} props
 * @param {string} props.icon FontAwesome class，如 'fas fa-archive'
 * @param {*} props.title 页面标题
 * @param {*} [props.subtitle] 统计副标题（可选）
 */
const PageHeaderCard = ({ icon, title, subtitle }) => {
  return (
    <div className='wow fadeInUp w-full rounded-xl border bg-white dark:bg-[#1e1e1e] dark:border-gray-600 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] p-6 mb-4 transition-colors duration-300'>
      <div className='flex items-center gap-4'>
        {icon && (
          <div className='flex-shrink-0 w-12 h-12 rounded-lg bg-[#f1f3f8] dark:bg-gray-800 flex items-center justify-center'>
            <i
              className={`${icon} text-xl text-[var(--heo-color-primary)] dark:text-[var(--heo-color-accent)]`}
            />
          </div>
        )}
        <div className='min-w-0'>
          <h1 className='text-2xl font-extrabold text-black dark:text-gray-100 leading-tight'>
            {title}
          </h1>
          {subtitle && (
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1 truncate'>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PageHeaderCard
```

- [ ] **Step 2: Lint**

Run: `npx eslint themes/heo/components/PageHeaderCard.js`
Expected: 无错误无警告

- [ ] **Step 3: Commit**

```bash
git add themes/heo/components/PageHeaderCard.js
git commit -m "feat(heo): add shared PageHeaderCard component"
```

---

### Task 2: ArchiveTimeline 归档时间线组件

**Files:**
- Create: `themes/heo/components/ArchiveTimeline.js`

**Interfaces:**
- Produces: `ArchiveTimeline`（default export），props：`{ archivePosts: Object<string, post[]> }`（key 为 `yyyy-MM`，值按日期倒序）。Task 3 的 `LayoutArchive` 消费它。
- 组件内部将月份 key 归并为年份分组；每年内按月份顺序平铺文章；**每个月份分组的第一篇文章所在 `<li>` 带 `id={monthKey}`（`yyyy-MM`）**，保证 hash 锚点兼容。

- [ ] **Step 1: 创建组件**

```jsx
import { siteConfig } from '@/lib/config'
import { formatDateFmt } from '@/lib/utils/formatDate'
import SmartLink from './HeoLink'
import { withHeoSubPath } from '../utils/path'

function getPostHref(post) {
  if (post?.href) return withHeoSubPath(post.href)
  if (!post?.slug) return '#'

  const rawSlug = String(post.slug)
  if (/^https?:\/\//i.test(rawSlug)) return rawSlug

  const subPath = siteConfig('SUB_PATH', '') || ''
  const slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`
  return withHeoSubPath(`${subPath}${slug}` || '/')
}

function getPostText(value, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join(' ') || fallback
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || fallback
  }
  return fallback
}

function formatMonthDay(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return formatDateFmt(value, 'MM-dd')
}

/**
 * 归档时间线
 * 按年份分组，左侧竖线 + 主色圆点节点；每月第一篇文章带 yyyy-MM 锚点 id
 * （pages/archive/index.js 的 hash 滚动依赖该 id）
 * @param {object} props
 * @param {Object<string, Array>} props.archivePosts key 为 yyyy-MM，按日期倒序
 */
const ArchiveTimeline = ({ archivePosts }) => {
  const safeArchivePosts =
    archivePosts && typeof archivePosts === 'object' ? archivePosts : {}

  // 月份 key 倒序（yyyy-MM 字符串字典序即时间序）
  const monthKeys = Object.keys(safeArchivePosts).sort((a, b) =>
    a < b ? 1 : -1
  )

  // 归并为年份分组，保持倒序
  const yearGroups = []
  monthKeys.forEach(monthKey => {
    const year = monthKey.split('-')[0]
    let yearGroup = yearGroups.find(group => group.year === year)
    if (!yearGroup) {
      yearGroup = { year, months: [], count: 0 }
      yearGroups.push(yearGroup)
    }
    const posts = Array.isArray(safeArchivePosts[monthKey])
      ? safeArchivePosts[monthKey].filter(Boolean)
      : []
    yearGroup.months.push({ monthKey, posts })
    yearGroup.count += posts.length
  })

  if (yearGroups.length === 0) return null

  return (
    <div>
      {yearGroups.map(yearGroup => (
        <div key={yearGroup.year} className='wow fadeInUp'>
          {/* 年份头部 */}
          <div className='flex items-center gap-3 mt-6 mb-3 first:mt-0'>
            <span className='text-3xl font-extrabold leading-none text-[var(--heo-color-primary)] dark:text-[var(--heo-color-accent)]'>
              {yearGroup.year}
            </span>
            <span className='px-2 py-0.5 rounded-full bg-[#f1f3f8] dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400'>
              {yearGroup.count} 篇
            </span>
          </div>

          {/* 时间线 */}
          <ul className='relative border-l-2 border-gray-200 dark:border-gray-700 pl-8 ml-1 mb-6'>
            {yearGroup.months.map(month =>
              month.posts.map((post, index) => {
                const postHref = getPostHref(post)
                const title = getPostText(post?.title, '未命名')
                const monthDay = formatMonthDay(post?.publishDate)
                const category = getPostText(post?.category)
                return (
                  <li
                    key={post?.id || post?.slug || `${month.monthKey}-${index}`}
                    id={index === 0 ? month.monthKey : undefined}
                    className='relative scroll-mt-24'>
                    <div className='group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#f1f3f8] dark:hover:bg-gray-800/60 transition-colors duration-200'>
                      {/* 节点圆点：定位在左侧竖线上（pl-8 + border-l-2 的几何中心） */}
                      <span className='absolute -left-9 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-[var(--heo-color-primary)] dark:border-[var(--heo-color-accent)] bg-white dark:bg-[#1e1e1e] transition-all duration-200 group-hover:scale-125 group-hover:bg-[var(--heo-color-primary)] dark:group-hover:bg-[var(--heo-color-accent)]' />
                      {/* 日期 */}
                      <span className='flex-shrink-0 w-12 text-sm text-gray-500 dark:text-gray-400'>
                        {monthDay}
                      </span>
                      {/* 标题 */}
                      <SmartLink
                        href={postHref}
                        className='flex-1 min-w-0 truncate md:line-clamp-2 md:whitespace-normal font-bold text-black dark:text-gray-100 group-hover:text-[var(--heo-color-primary)] dark:group-hover:text-[var(--heo-color-accent)] transition-colors'>
                        {title}
                      </SmartLink>
                      {/* 分类 chip（移动端隐藏） */}
                      {category && (
                        <SmartLink
                          href={`/category/${encodeURIComponent(category)}`}
                          className='flex-shrink-0 hidden sm:inline-block px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-xs text-gray-600 dark:text-gray-400 hover:text-[var(--heo-color-primary)] dark:hover:text-[var(--heo-color-accent)] transition-colors'>
                          {category}
                        </SmartLink>
                      )}
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default ArchiveTimeline
```

- [ ] **Step 2: Lint**

Run: `npx eslint themes/heo/components/ArchiveTimeline.js`
Expected: 无错误无警告

- [ ] **Step 3: Commit**

```bash
git add themes/heo/components/ArchiveTimeline.js
git commit -m "feat(heo): add ArchiveTimeline component"
```

---

### Task 3: LayoutArchive 重构（接入页头 + 时间线，删除旧组件）

**Files:**
- Modify: `themes/heo/index.js`（import 区、`LayoutArchive` 函数，当前约 988-1011 行）
- Delete: `themes/heo/components/BlogPostArchive.js`

**Interfaces:**
- Consumes: `PageHeaderCard`（Task 1）、`ArchiveTimeline`（Task 2）
- Produces: `LayoutArchive` 对外 props 契约不变（仍接收 `archivePosts`、`categoryOptions`、`tagOptions` 等全量 props）

- [ ] **Step 1: 替换 import**

在 `themes/heo/index.js` 中：

删除：
```js
import BlogPostArchive from './components/BlogPostArchive'
```

添加（放在 `import BlogPostListPage` 之前，保持字母序与现有 import 风格一致）：
```js
import ArchiveTimeline from './components/ArchiveTimeline'
```

并在 `import LatestPostsGroup from './components/LatestPostsGroup'` 之后添加：
```js
import PageHeaderCard from './components/PageHeaderCard'
```

- [ ] **Step 2: 重写 LayoutArchive**

将现有 `LayoutArchive` 函数（约 988-1011 行，含上方 JSDoc）整体替换为：

```jsx
/**
 * 归档
 * @param {*} props
 * @returns
 */
const LayoutArchive = props => {
  const { archivePosts, categoryOptions, tagOptions } = props
  const { locale } = useGlobal()
  const safeArchivePosts =
    archivePosts && typeof archivePosts === 'object' ? archivePosts : {}

  // 页头统计
  const postTotal = Object.values(safeArchivePosts).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.filter(Boolean).length : 0),
    0
  )
  const categoryTotal = Array.isArray(categoryOptions)
    ? categoryOptions.filter(category => category?.name).length
    : 0
  const tagTotal = Array.isArray(tagOptions)
    ? tagOptions.filter(tag => tag?.name).length
    : 0

  return (
    <div className='max-w-6xl w-full'>
      {/* 页头卡片 */}
      <PageHeaderCard
        icon='fas fa-archive'
        title={locale.NAV.ARCHIVE}
        subtitle={`共 ${postTotal} 篇文章 · ${categoryTotal} 个分类 · ${tagTotal} 个标签`}
      />

      <div className='p-5 rounded-xl border dark:border-gray-600 bg-[var(--heo-color-card)] dark:bg-[var(--heo-color-card-dark)]'>
        {/* 文章分类条 */}
        <CategoryBar {...props} border={false} />

        <div className='px-3'>
          <ArchiveTimeline archivePosts={safeArchivePosts} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 删除旧组件文件**

```bash
git rm themes/heo/components/BlogPostArchive.js
```

并确认无残留引用：

Run: `grep -rn "BlogPostArchive" themes/ pages/ components/`
Expected: 无输出

- [ ] **Step 4: Lint**

Run: `npx eslint themes/heo/index.js`
Expected: 无错误无警告

- [ ] **Step 5: Commit**

```bash
git add themes/heo/index.js
git commit -m "feat(heo): redesign archive page with stats header and timeline"
```

---

### Task 4: LayoutCategoryIndex + CategoryPostCard 重构

**Files:**
- Modify: `themes/heo/index.js`（`LayoutCategoryIndex` 约 1225-1328 行、`CategoryPostCard` 约 1333-1395 行）

**Interfaces:**
- Consumes: `PageHeaderCard`（Task 1）；现有局部助手 `getFiniteNumber`、`getSearchText`、`getPostHref`、`formatDate`（均已在 index.js 定义，无需新增）
- Produces: `LayoutCategoryIndex` 对外 props 契约不变

- [ ] **Step 1: 重写 LayoutCategoryIndex**

将现有 `LayoutCategoryIndex` 函数（含上方 JSDoc 注释「分类列表…」）整体替换为：

```jsx
/**
 * 分类列表
 * 页头卡片 + 分类封面网格 + 每分类最新文章预览
 * @param {*} props
 * @returns
 */
const LayoutCategoryIndex = props => {
  const { categoryOptions, categoryPreviewPosts, allPages } = props
  const { locale } = useGlobal()
  const safeCategoryOptions = Array.isArray(categoryOptions)
    ? categoryOptions.filter(category => category?.name)
    : []
  const safePreviewPosts = Array.isArray(categoryPreviewPosts)
    ? categoryPreviewPosts
    : Array.isArray(allPages)
      ? allPages
      : []

  const getPostsByCategory = categoryName =>
    safePreviewPosts.filter(
      p => p?.category === categoryName && p?.status === 'Published'
    )

  return (
    <div id='category-outer-wrapper' className='mt-8 px-5 md:px-0'>
      {/* 页头卡片 */}
      <PageHeaderCard
        icon='fas fa-folder-open'
        title={locale.COMMON.CATEGORY}
        subtitle={`共 ${safeCategoryOptions.length} 个分类`}
      />

      {/* 分类封面卡片网格 */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8'>
        {safeCategoryOptions.map((category, index) => {
          const posts = getPostsByCategory(category.name)
          const cover = posts.find(p => p?.pageCoverThumbnail)
            ?.pageCoverThumbnail
          return (
            <CategoryCard
              key={category.name}
              category={category}
              cover={cover}
              prioritize={index < 4}
            />
          )
        })}
      </div>

      {/* 分类文章列表 */}
      <div id='category-list' className='space-y-10'>
        {safeCategoryOptions.map(category => {
          const posts = getPostsByCategory(category.name).slice(0, 4) // 每个分类显示4篇文章

          if (!posts || posts.length === 0) return null

          return (
            <div
              key={category.name}
              className='wow fadeInUp bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-600 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] transition-colors duration-300'>
              {/* 分类标题 */}
              <div className='flex items-center justify-between mb-6 gap-3'>
                <div className='flex items-center gap-3 min-w-0'>
                  <h2 className='text-xl font-extrabold dark:text-white truncate'>
                    {category.name}
                  </h2>
                  <span className='flex-shrink-0 px-2 py-0.5 rounded-full bg-[#f1f3f8] dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400'>
                    {getFiniteNumber(category?.count, 0)} 篇
                  </span>
                </div>
                <SmartLink
                  href={`/category/${encodeURIComponent(category.name)}`}
                  className='flex-shrink-0 text-sm font-bold text-[var(--heo-color-primary)] dark:text-[var(--heo-color-accent)] hover:underline flex items-center gap-1'>
                  查看全部 <i className='fas fa-arrow-right text-xs' />
                </SmartLink>
              </div>

              {/* 文章卡片 - 横向布局 */}
              <div className='space-y-4'>
                {posts?.map((post, index) => (
                  <CategoryPostCard
                    key={post?.id || post?.slug || index}
                    post={post}
                    index={index}
                    siteInfo={props.siteInfo}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 分类网格卡片 - 最新文章封面做卡底，无封面降级为 muted + 图标
 */
const CategoryCard = ({ category, cover, prioritize }) => {
  if (!category?.name) return null
  const count = getFiniteNumber(category?.count, 0)

  return (
    <SmartLink
      href={`/category/${encodeURIComponent(category.name)}`}
      className='wow fadeInUp group relative block heo-post-cover rounded-xl overflow-hidden border dark:border-gray-600 bg-[#f1f3f8] dark:bg-gray-800 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] hover:shadow-lg transition-all duration-300'>
      {cover ? (
        <>
          <LazyImage
            priority={prioritize}
            width={505}
            height={220}
            sizes='(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw'
            src={cover}
            alt={category.name}
            className='absolute inset-0 h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500'
          />
          {/* 中性黑色遮罩 */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />
          <div className='absolute bottom-0 left-0 right-0 p-4'>
            <div className='font-extrabold text-lg text-white truncate'>
              {category.name}
            </div>
            <div className='text-xs text-white opacity-80 mt-0.5'>
              {count} 篇文章
            </div>
          </div>
        </>
      ) : (
        <div className='absolute inset-0 flex flex-col items-center justify-center p-4'>
          <i className='fas fa-folder text-2xl text-[var(--heo-color-primary)] dark:text-[var(--heo-color-accent)] mb-2' />
          <div className='font-extrabold text-black dark:text-gray-100 truncate w-full text-center'>
            {category.name}
          </div>
          <div className='text-xs text-gray-600 dark:text-gray-400 mt-0.5'>
            {count} 篇文章
          </div>
        </div>
      )}
    </SmartLink>
  )
}
```

注意：`text-white` 在 style.js 中被映射为 `var(--heo-color-primary-text)`（默认白色），在封面遮罩上表现为白色，与主题体系一致，无需改动。

- [ ] **Step 2: 重构 CategoryPostCard 样式**

将 `CategoryPostCard` 中两处颜色改为 Heo 变量（其余结构、props、逻辑完全不动）：

1. `<article>` 的 hover 底色：
   - 旧：`hover:bg-gray-50 dark:hover:bg-gray-800/50`
   - 新：`hover:bg-[#f1f3f8] dark:hover:bg-gray-800/60`
2. `<h3>` 标题 hover 色：
   - 旧：`group-hover:text-blue-600 dark:group-hover:text-purple-400`
   - 新：`group-hover:text-[var(--heo-color-primary)] dark:group-hover:text-[var(--heo-color-accent)]`

- [ ] **Step 3: Lint + 残留杂色检查**

Run: `npx eslint themes/heo/index.js`
Expected: 无错误无警告

Run: `grep -n "blue-\|purple-\|emerald-\|teal-" themes/heo/index.js`
Expected: 无 `LayoutCategoryIndex`/`CategoryPostCard` 相关输出（其他 Layout 若命中，不在本任务范围，保持不动）

- [ ] **Step 4: Commit**

```bash
git add themes/heo/index.js
git commit -m "feat(heo): redesign category index page with cover grid"
```

---

### Task 5: LayoutTagIndex + TagPostCard 重构

**Files:**
- Modify: `themes/heo/index.js`（`LayoutTagIndex` 约 1402-1557 行、`TagPostCard` 约 1562-1620 行）

**Interfaces:**
- Consumes: `PageHeaderCard`（Task 1）；现有局部助手 `getFiniteNumber`、`getSearchText`、`getPostHref`、`postHasTag`、`formatDate`
- Produces: `LayoutTagIndex` 对外 props 契约不变；`selectedTag` 交互行为不变

- [ ] **Step 1: 重写 LayoutTagIndex**

将现有 `LayoutTagIndex` 函数（含上方 JSDoc）整体替换为：

```jsx
/**
 * 标签列表
 * 页头卡片 + 统一 pill 标签云（点击预览）+ 热门标签文章分组
 * @param {*} props
 * @returns
 */
const LayoutTagIndex = props => {
  const { tagOptions, allPages, tagPreviewPostsByTag } = props
  const { locale } = useGlobal()
  const safeTagOptions = Array.isArray(tagOptions)
    ? tagOptions.filter(tag => tag?.name)
    : []
  const safeAllPages = Array.isArray(allPages) ? allPages : []
  const [selectedTag, setSelectedTag] = useState(
    /** @type {string | null} */ (null)
  )
  const getPreviewPostsByTag = tagName => {
    const previewPosts = tagPreviewPostsByTag?.[tagName]
    if (Array.isArray(previewPosts)) return previewPosts.filter(Boolean)

    return (
      safeAllPages.filter(
        p => postHasTag(p, tagName) && p?.status === 'Published'
      ) || []
    )
  }

  // 获取选中标签的文章
  const selectedPosts = selectedTag
    ? getPreviewPostsByTag(selectedTag).slice(0, 8)
    : []

  // 标签云按文章数降序
  const sortedTagOptions = [...safeTagOptions].sort(
    (a, b) => getFiniteNumber(b?.count, 0) - getFiniteNumber(a?.count, 0)
  )

  return (
    <div id='tag-outer-wrapper' className='px-5 mt-8 md:px-0'>
      {/* 页头卡片 */}
      <PageHeaderCard
        icon='fas fa-tags'
        title={locale.COMMON.TAGS}
        subtitle={`共 ${safeTagOptions.length} 个标签`}
      />

      {/* 标签云 - 统一 pill，点击预览 */}
      <div className='wow fadeInUp bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-600 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] transition-colors duration-300 mb-8'>
        <div className='flex flex-wrap gap-2'>
          {sortedTagOptions.map(tag => {
            const count = getFiniteNumber(tag?.count, 0)
            const isSelected = selectedTag === tag.name

            return (
              <button
                key={tag.name}
                onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                  isSelected
                    ? 'bg-indigo-600 dark:bg-yellow-600 text-white border-transparent shadow-md scale-105'
                    : 'bg-[#f1f3f8] dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-transparent hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] hover:text-[var(--heo-color-primary)] dark:hover:text-[var(--heo-color-accent)]'
                }`}>
                #{tag.name}
                <sup className='ml-1 text-xs opacity-70'>{count}</sup>
              </button>
            )
          })}
        </div>
      </div>

      {/* 选中标签的文章预览 */}
      {selectedTag && selectedPosts.length > 0 && (
        <div className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-600 mb-8 animate-fade-in'>
          <div className='flex items-center justify-between mb-6 gap-3'>
            <h2 className='text-xl font-extrabold dark:text-white flex items-center gap-2 min-w-0'>
              <span className='flex-shrink-0 px-3 py-1 bg-indigo-600 dark:bg-yellow-600 text-white rounded-full text-sm'>
                #{selectedTag}
              </span>
              <span className='truncate'>的相关文章</span>
            </h2>
            <SmartLink
              href={'/tag/' + encodeURIComponent(selectedTag)}
              className='flex-shrink-0 text-sm font-bold text-[var(--heo-color-primary)] dark:text-[var(--heo-color-accent)] hover:underline flex items-center gap-1'>
              查看全部 <i className='fas fa-arrow-right text-xs' />
            </SmartLink>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {selectedPosts.map((post, index) => (
              <TagPostCard
                key={post?.id || post?.slug || index}
                post={post}
                index={index}
                siteInfo={props.siteInfo}
              />
            ))}
          </div>
        </div>
      )}

      {/* 按标签分组的文章列表 */}
      <div id='tag-list' className='space-y-8'>
        {safeTagOptions.slice(0, 10).map(tag => {
          const posts = getPreviewPostsByTag(tag.name).slice(0, 3)

          if (!posts || posts.length === 0) return null

          return (
            <div
              key={tag.name}
              className='wow fadeInUp bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-600 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] transition-colors duration-300'>
              {/* 标签标题 */}
              <div className='flex items-center justify-between mb-5 gap-3'>
                <div className='flex items-center gap-3 min-w-0'>
                  <h2 className='text-xl font-extrabold dark:text-white truncate'>
                    #{tag.name}
                  </h2>
                  <span className='flex-shrink-0 px-2 py-0.5 rounded-full bg-[#f1f3f8] dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400'>
                    {getFiniteNumber(tag?.count, 0)} 篇
                  </span>
                </div>
                <SmartLink
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  className='flex-shrink-0 text-sm font-bold text-[var(--heo-color-primary)] dark:text-[var(--heo-color-accent)] hover:underline flex items-center gap-1'>
                  查看全部 <i className='fas fa-arrow-right text-xs' />
                </SmartLink>
              </div>

              {/* 文章卡片 - 网格布局 */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {posts?.map((post, index) => (
                  <TagPostCard
                    key={post?.id || post?.slug || index}
                    post={post}
                    index={index}
                    siteInfo={props.siteInfo}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

说明：原 `maxTagCount`/字号阶梯逻辑随统一 pill 设计一并移除；`selectedTag` state、`getPreviewPostsByTag`、预览 slice 逻辑与现状完全一致，交互行为无变化。

- [ ] **Step 2: 重构 TagPostCard 样式**

将 `TagPostCard` 中两处颜色改为 Heo 变量（其余结构、props、逻辑完全不动）：

1. `<article>` 的 hover 描边：
   - 旧：`hover:border-emerald-500 dark:hover:border-teal-500`
   - 新：`hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)]`
2. `<h3>` 标题 hover 色：
   - 旧：`group-hover:text-emerald-600 dark:group-hover:text-teal-400`
   - 新：`group-hover:text-[var(--heo-color-primary)] dark:group-hover:text-[var(--heo-color-accent)]`

- [ ] **Step 3: Lint + 残留杂色检查**

Run: `npx eslint themes/heo/index.js`
Expected: 无错误无警告

Run: `grep -n "emerald-\|teal-\|blue-\|purple-" themes/heo/index.js`
Expected: 无 `LayoutTagIndex`/`TagPostCard` 相关输出

- [ ] **Step 4: Commit**

```bash
git add themes/heo/index.js
git commit -m "feat(heo): redesign tag index page with uniform pill cloud"
```

---

### Task 6: 全量验证

**Files:**
- 无新增改动（仅验证）

- [ ] **Step 1: 全量 lint**

Run: `npm run lint`
Expected: 通过（与 main 分支基线一致，不新增任何警告/错误）

- [ ] **Step 2: 生产构建**

Run: `npm run build`
Expected: 构建成功，`/archive`、`/tag`、`/category` 三个路由正常生成。（若因本机缺少 Notion 凭据/网络导致构建在数据拉取阶段失败，则记录该环境限制，改以 `npm run dev` 编译通过为准——编译错误会在此阶段暴露。）

- [ ] **Step 3: dev 目测验证（如环境允许）**

Run: `npm run dev`，访问 `http://localhost:3000`
检查清单：
1. `/archive`：页头统计数字正确；时间线圆点对齐竖线；年份倒序；`/#2024-05` 形式的 hash 能滚动到对应月份
2. `/category`：网格卡片封面/降级样式正常；hover 描边主色；「查看全部」跳转正确
3. `/tag`：标签云点选/取消正常；选中预览出现；pill 选中态为主色实心
4. 暗色模式切换：三页所有高亮变为金黄 accent、卡片底色正确
5. 移动端 375px：时间线日期不溢出、分类 chip 隐藏、网格 2 列
6. 控制台无新增报错/警告

- [ ] **Step 4: 如有问题修复并提交**

```bash
git add -A
git commit -m "fix(heo): address visual verification issues"
```

---

## Self-Review 记录

- **Spec 覆盖**：统一设计语言（Task 1）、归档统计+时间线（Task 2/3）、分类封面网格+预览（Task 4）、标签云+预览+分组（Task 5）、性能预算（各任务 priority/懒加载约束 + Global Constraints）、锚点兼容（Task 2 接口说明 + Task 6 检查项）、暗色/响应式验证（Task 6）。无遗漏。
- **Placeholder 扫描**：无 TBD/TODO；所有代码步骤均含完整代码。
- **类型一致性**：`PageHeaderCard` props `{icon, title, subtitle}` 在 Task 3/4/5 的消费处一致；`ArchiveTimeline` props `{archivePosts}` 与 Task 3 调用一致；`CategoryCard` props `{category, cover, prioritize}` 在 Task 4 内定义并消费一致；`CategoryPostCard`/`TagPostCard` 的 props 契约（`{post, index, siteInfo}`）未改变。
