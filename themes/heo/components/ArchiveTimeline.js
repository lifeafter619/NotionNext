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
