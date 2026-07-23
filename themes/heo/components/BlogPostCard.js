import LazyImage from '@/components/LazyImage'
import NotionIcon from './NotionIcon'
import { siteConfig } from '@/lib/config'
import SmartLink from './HeoLink'
import CONFIG from '../config'
import TagItemMini from './TagItemMini'

function getPostHref(post) {
  if (post?.href) return post.href
  if (!post?.slug) return '#'

  const rawSlug = String(post.slug)
  if (/^https?:\/\//i.test(rawSlug)) return rawSlug

  const subPath = siteConfig('SUB_PATH', '') || ''
  const slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`
  return `${subPath}${slug}` || '/'
}

function getPostText(value, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join(' ') || fallback
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || fallback
  }
  return fallback
}

const BlogPostCard = ({ index, post, showSummary, siteInfo, className }) => {
  if (!post) return null

  const showPreview =
    siteConfig('HEO_POST_LIST_PREVIEW', null, CONFIG) && post?.blockMap
  const fallbackPageCover =
    post &&
    !post.pageCoverThumbnail &&
    siteConfig('HEO_POST_LIST_COVER_DEFAULT', null, CONFIG)
      ? siteInfo?.pageCover
      : null
  const pageCoverThumbnail = post?.pageCoverThumbnail || fallbackPageCover
  const showPageCover =
    siteConfig('HEO_POST_LIST_COVER', null, CONFIG) &&
    pageCoverThumbnail &&
    !showPreview

  const POST_TWO_COLS = siteConfig('HEO_HOME_POST_TWO_COLS', true, CONFIG)
  const COVER_HOVER_ENLARGE = siteConfig(
    'HEO_POST_LIST_COVER_HOVER_ENLARGE',
    true,
    CONFIG
  )
  const CROSSOVER_COVER = siteConfig(
    'HEO_POST_LIST_IMG_CROSSOVER',
    false,
    CONFIG
  )
  const reverseCover = CROSSOVER_COVER && index % 2 === 1
  const tagItems = Array.isArray(post?.tagItems)
    ? post.tagItems.filter(tag => tag?.name)
    : []
  const postHref = getPostHref(post)
  const title = getPostText(post?.title, '未命名')
  const summary = getPostText(post?.summary)
  const category = getPostText(post?.category)

  // 如果传入了className，则使用传入的样式，否则使用默认样式
  // 默认样式为：2xl:h-96 2xl:flex-col h-[23rem] md:h-52 md:flex-row
  // 传入样式为：h-40 text-sm

  const isDefaultStyle = !className
  const containerClass = className
    ? `wow fadeInUp border bg-white dark:bg-[#1e1e1e] flex mb-4 flex-col group w-full dark:border-gray-600 hover:border-indigo-600 dark:hover:border-yellow-600 duration-300 transition-colors justify-between overflow-hidden rounded-xl ${className}`
    : (POST_TWO_COLS ? '2xl:h-96 2xl:flex-col' : '') +
      ` wow fadeInUp border bg-white dark:bg-[#1e1e1e] flex mb-4 flex-col h-[23rem] md:h-52 md:flex-row ${reverseCover ? 'md:flex-row-reverse' : ''} group w-full dark:border-gray-600 hover:border-indigo-600  dark:hover:border-yellow-600 duration-300 transition-colors justify-between overflow-hidden rounded-xl`

  return (
    <article
      className={`${COVER_HOVER_ENLARGE ? 'hover:transition-all duration-150' : ''}`}>
      <div data-wow-delay='.2s' className={containerClass}>
        {/* 图片封面 */}
        {showPageCover && (
          <SmartLink
            href={postHref}
            className={
              (isDefaultStyle && POST_TWO_COLS ? ' 2xl:w-full' : '') +
              (isDefaultStyle ? ' flex-1 min-h-0 md:flex-none' : '') +
              ' block w-full md:w-5/12 overflow-hidden cursor-pointer select-none'
            }>
            <LazyImage
              priority={index === 0 && Boolean(pageCoverThumbnail)}
              width={POST_TWO_COLS ? 620 : 460}
              height={POST_TWO_COLS ? 220 : 208}
              sizes={
                POST_TWO_COLS
                  ? '(min-width: 1536px) 43vw, (min-width: 720px) 42vw, 100vw'
                  : '(min-width: 720px) 42vw, 100vw'
              }
              src={pageCoverThumbnail}
              alt={title}
              className={`h-full w-full object-cover object-center ${COVER_HOVER_ENLARGE ? 'group-hover:scale-105' : ''} group-hover:brightness-75 transition-all duration-500 ease-in-out`} //宽高都调整为自适应,保证封面居中
            />
          </SmartLink>
        )}

        {/* 文字区块 */}
        <div
          className={
            (isDefaultStyle && POST_TWO_COLS
              ? '2xl:p-4 2xl:h-48 2xl:w-full'
              : '') +
            ` flex ${isDefaultStyle ? 'p-6' : 'p-3'} flex-col justify-between h-48 md:h-full w-full${showPageCover ? ' md:w-7/12' : ''}`
          }>
          <header>
            {/* 分类 */}
            {category && (
              <div
                className={`flex mb-1 items-center ${showPreview ? 'justify-center' : 'justify-start'} hidden md:block flex-wrap dark:text-gray-300 text-gray-600 hover:text-[var(--heo-color-primary)] dark:hover:text-[var(--heo-color-accent)]`}>
                <SmartLink
                  passHref
                  href={`/category/${encodeURIComponent(category)}`}
                  className='cursor-pointer text-xs font-normal menu-link '>
                  {category}
                </SmartLink>
              </div>
            )}

            {/* 标题和图标 */}
            <SmartLink
              href={postHref}
              passHref
              className={
                ' group-hover:text-[var(--heo-color-primary)] dark:hover:text-[var(--heo-color-accent)] dark:group-hover:text-[var(--heo-color-accent)] text-black dark:text-gray-100  line-clamp-2 replace cursor-pointer text-xl font-extrabold leading-tight'
              }>
              {siteConfig('POST_TITLE_ICON') && (
                <NotionIcon
                  icon={post.pageIcon}
                  className='heo-icon w-6 h-6 mr-1 align-middle transform translate-y-[-8%]' // 专门为 Heo 主题的图标设置样式
                />
              )}
              <span className='menu-link '>{title}</span>
            </SmartLink>
          </header>

          {/* 摘要 */}
          {(!showPreview || showSummary) && (
            <p className='line-clamp-2 replace text-gray-700  dark:text-gray-300 text-sm font-light leading-tight'>
              {summary}
            </p>
          )}

          <div className='md:flex-nowrap flex-wrap md:justify-start inline-block'>
            <div>
              {' '}
              {tagItems.map(tag => (
                <TagItemMini key={tag.name} tag={tag} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default BlogPostCard
