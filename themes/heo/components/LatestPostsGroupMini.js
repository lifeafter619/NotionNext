import LazyImage from '@/components/LazyImage'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
// import Image from 'next/image'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'

const getLatestPostKey = (post, index) => {
  if (post?.id) return post.id
  const fallback = post?.slug || post?.href || post?.title || 'latest-post'
  return `${fallback}-${index}`
}

function getPostHref(post, subPath = '') {
  if (post?.href) return post.href
  if (!post?.slug) return '#'

  const rawSlug = String(post.slug)
  if (/^https?:\/\//i.test(rawSlug)) return rawSlug

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
export default function LatestPostsGroupMini({ latestPosts, siteInfo }) {
  // 获取当前路径
  const currentPath = useRouter().asPath
  const { locale } = useGlobal()
  const SUB_PATH = siteConfig('SUB_PATH', '')
  const posts = Array.isArray(latestPosts)
    ? latestPosts.filter(post => post?.href || post?.slug)
    : []

  return posts.length > 0 ? (
    <>
      <div className=' mb-2 px-1 flex flex-nowrap justify-between'>
        <div>
          <i className='mr-2 fas fas fa-history' />
          {locale.COMMON.LATEST_POSTS}
        </div>
      </div>
      {posts.map((post, index) => {
        const href = getPostHref(post, SUB_PATH)
        const selected =
          href !== '#' &&
          !/^https?:\/\//i.test(href) &&
          currentPath.split(/[?#]/)[0] === href
        const headerImage =
          post?.pageCoverThumbnail || post?.pageCover || siteInfo?.pageCover
        const title = getPostTitle(post)
        const lastEditedDay =
          typeof post?.lastEditedDay === 'string' ||
          typeof post?.lastEditedDay === 'number'
            ? String(post.lastEditedDay)
            : ''

        return (
          <SmartLink
            key={getLatestPostKey(post, index)}
            title={title}
            href={href}
            passHref
            className={'my-3 flex'}>
            <div className='w-20 h-14 overflow-hidden relative pointer-events-none'>
              {headerImage ? (
                <LazyImage
                  src={headerImage}
                  alt={title}
                  width={80}
                  height={56}
                  sizes='80px'
                  className='object-cover w-full h-full rounded-lg'
                />
              ) : (
                <div className='w-full h-full rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400'>
                  <i className='fas fa-file-lines' />
                </div>
              )}
            </div>
            <div
              className={
                (selected ? ' text-indigo-400 ' : 'dark:text-gray-200') +
                ' text-sm overflow-x-hidden hover:text-indigo-600 px-2 duration-200 w-full rounded ' +
                ' hover:text-indigo-400 dark:hover:text-yellow-600 cursor-pointer items-center flex'
              }>
              <div>
                <div className='line-clamp-2 menu-link'>{title}</div>
                {lastEditedDay && (
                  <div className='text-gray-400'>{lastEditedDay}</div>
                )}
              </div>
            </div>
          </SmartLink>
        )
      })}
    </>
  ) : null
}
