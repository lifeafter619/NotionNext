import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { withHeoSubPath } from '../utils/path'

/**
 * 随机跳转到一个文章
 */
export default function RandomPostButton(props) {
  const { latestPosts = [] } = props
  const router = useRouter()
  const { locale } = useGlobal()
  const posts = Array.isArray(latestPosts)
    ? latestPosts.filter(post => post?.href || post?.slug)
    : []

  const getPostHref = post => {
    if (post?.href) return withHeoSubPath(post.href)
    if (!post?.slug) return null
    const rawSlug = String(post.slug)
    if (/^https?:\/\//i.test(rawSlug)) return rawSlug

    const subPath = siteConfig('SUB_PATH', '') || ''
    const slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`
    return withHeoSubPath(`${subPath}${slug}` || '/')
  }

  /**
   * 随机跳转文章
   */
  function handleClick() {
    if (posts.length === 0) return

    const randomIndex = Math.floor(Math.random() * posts.length)
    const href = getPostHref(posts[randomIndex])
    if (href) {
      router.push(href)
    }
  }

  return (
    <button
      type='button'
      title={locale.MENU.WALK_AROUND}
      disabled={posts.length === 0}
      className={`${posts.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-black hover:bg-opacity-10'} rounded-full w-10 h-10 flex justify-center items-center duration-200 transition-all`}
      onClick={handleClick}>
      <i aria-hidden='true' className='fa-solid fa-podcast'></i>
    </button>
  )
}
