import LazyImage from '@/components/LazyImage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'

function getPostHref(post) {
  if (post?.href) return post.href
  if (!post?.slug) return '#'

  const rawSlug = String(post.slug)
  if (/^https?:\/\//i.test(rawSlug)) return rawSlug

  const subPath = siteConfig('SUB_PATH', '') || ''
  const slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`
  return `${subPath}${slug}` || '/'
}

function getPostTitle(post) {
  const title = post?.title
  if (Array.isArray(title)) return title.filter(Boolean).join(' ') || '未命名'
  if (typeof title === 'string' || typeof title === 'number') {
    return String(title).trim() || '未命名'
  }
  return '未命名'
}

/**
 * 最新文章列表
 * @param posts 所有文章数据
 * @param sliceCount 截取展示的数量 默认6
 * @constructor
 */
const LatestPostsGroup = ({ latestPosts, siteInfo }) => {
  // 获取当前路径

  const posts = Array.isArray(latestPosts)
    ? latestPosts.filter(post => post?.href || post?.slug)
    : []

  if (posts.length === 0) {
    return <></>
  }

  return (
    <div className='grid grid-cols-2 gap-4'>
      {posts.map((post, index) => {
        const headerImage = post?.pageCoverThumbnail
          ? post.pageCoverThumbnail
          : siteInfo?.pageCover
        const href = getPostHref(post)
        const title = getPostTitle(post)

        return (
          <SmartLink
            key={post.id || post.slug || index}
            passHref
            title={title}
            href={href}
            className={'my-3 flex flex-col w-full'}>
            <div className='w-full h-24 md:h-60 overflow-hidden relative rounded-lg mb-2 pointer-events-none'>
              {headerImage ? (
                <LazyImage
                  src={headerImage}
                  alt={title}
                  width={360}
                  height={240}
                  sizes='(min-width: 720px) 20rem, 50vw'
                  className='object-cover w-full h-full'
                />
              ) : (
                <div className='w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400'>
                  <i className='fas fa-file-lines text-2xl' />
                </div>
              )}
            </div>

            <div
              className={
                ' font-bold  overflow-x-hidden dark:text-white hover:text-[var(--heo-color-primary)] px-2 duration-200 w-full rounded ' +
                ' cursor-pointer'
              }>
              <div className='line-clamp-2 menu-link'>{title}</div>
            </div>
          </SmartLink>
        )
      })}
    </div>
  )
}
export default LatestPostsGroup
