import LazyImage from '@/components/LazyImage'
import { siteConfig } from '@/lib/config'
import SmartLink from '@/components/SmartLink'
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

/**
 * 博客归档列表
 * @param posts 所有文章
 * @param archiveTitle 归档标题
 * @returns {JSX.Element}
 * @constructor
 */
const BlogPostArchive = ({ posts = [], archiveTitle, siteInfo }) => {
  const safePosts = Array.isArray(posts) ? posts.filter(Boolean) : []

  if (safePosts.length === 0) {
    return <></>
  } else {
    return (
      <div className=''>
        <div className='pb-4 dark:text-gray-300' id={archiveTitle}>
          {archiveTitle}
        </div>
        <ul>
          {safePosts.map((post, index) => {
            const postHref = getPostHref(post)
            const title = getPostText(post?.title, '未命名')
            const showPreview =
              siteConfig('HEO_POST_LIST_PREVIEW', null, CONFIG) &&
              post?.blockMap
            const fallbackPageCover =
              post &&
              !post.pageCoverThumbnail &&
              siteConfig('HEO_POST_LIST_COVER_DEFAULT', null, CONFIG)
                ? siteInfo?.pageCover
                : null
            const pageCoverThumbnail =
              post?.pageCoverThumbnail || fallbackPageCover
            const showPageCover =
              siteConfig('HEO_POST_LIST_COVER', null, CONFIG) &&
              pageCoverThumbnail &&
              !showPreview
            const tagItems = Array.isArray(post?.tagItems)
              ? post.tagItems.filter(tag => tag?.name)
              : []
            const category = getPostText(post?.category)
            return (
              <div
                key={post.id || post.slug || index}
                className={
                  'cursor-pointer flex flex-row mb-4 h-24 md:flex-row group w-full  dark:border-gray-600 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] duration-300 transition-colors justify-between overflow-hidden'
                }>
                {/* 图片封面 */}
                {showPageCover && (
                  <div>
                    <SmartLink href={postHref} passHref legacyBehavior>
                      <LazyImage
                        className={'rounded-xl bg-center bg-cover w-40 h-24'}
                        width={160}
                        height={96}
                        sizes='160px'
                        alt={title}
                        src={pageCoverThumbnail}
                      />
                    </SmartLink>
                  </div>
                )}

                {/* 文字区块 */}
                <div className={'flex px-2 flex-col justify-between w-full'}>
                  <div>
                    {/* 分类 */}
                    {category && (
                      <div
                        className={`flex items-center ${showPreview ? 'justify-center' : 'justify-start'} hidden md:block flex-wrap dark:text-gray-500 text-gray-600 `}>
                        <SmartLink
                          passHref
                          href={`/category/${encodeURIComponent(category)}`}
                          className='cursor-pointer text-xs font-normal menu-link hover:text-indigo-700  dark:text-gray-600 transform'>
                          {category}
                        </SmartLink>
                      </div>
                    )}

                    {/* 标题 */}
                    <SmartLink
                      href={postHref}
                      passHref
                      className={
                        ' group-hover:text-[var(--heo-color-primary)] group-hover:dark:text-[var(--heo-color-accent)] text-black dark:text-gray-100 dark:group-hover:text-[var(--heo-color-accent)] line-clamp-2 replace cursor-pointer text-xl font-extrabold leading-tight'
                      }>
                      <span className='menu-link '>{title}</span>
                    </SmartLink>
                  </div>

                  {/* 摘要 */}
                  {/* <p className="line-clamp-1 replace my-3 2xl:my-0 text-gray-700  dark:text-gray-300 text-xs font-light leading-tight">
                                        {post.summary}
                                    </p> */}

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
            )
          })}
        </ul>
      </div>
    )
  }
}

export default BlogPostArchive
