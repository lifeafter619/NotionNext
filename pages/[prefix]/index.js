import BLOG from '@/blog.config'
import useNotification from '@/components/Notification'
import TechGrow from '@/components/TechGrow'
import { siteConfig } from '@/lib/config'
import { resolvePostProps } from '@/lib/db/SiteDataApi'
import { useGlobal } from '@/lib/global'
import { getPageTableOfContents } from '@/lib/db/notion/getPageTableOfContents'
import { getPasswordQuery, rememberPasswordForPath } from '@/lib/utils/password'
import { checkSlugHasNoSlash } from '@/lib/utils/post'
import { DynamicLayout } from '@/themes/theme'
import { useRouter } from 'next/router'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { getStaticPathsBase } from '@/lib/build/staticPaths'
import { isExport } from '@/lib/utils/buildMode'

const isStaticExport = process.env.EXPORT === 'true'

/**
 * 根据notion的slug访问页面
 * 只解析一级目录例如 /about
 * @param {*} props
 * @returns
 */
const Slug = props => {
  const { post } = props
  const router = useRouter()
  const { locale } = useGlobal()
  const activePostId = useRef(post?.id)
  activePostId.current = post?.id

  // 文章锁🔐
  const [currentPost, setCurrentPost] = useState(post)
  const [lock, setLock] = useState(Boolean(post?.password))
  const { showNotification, Notification } = useNotification()

  /**
   * 验证文章密码
   * @param {*} passInput
   */
  const validPassword = async passInput => {
    if (!post?.id || !passInput || isStaticExport) {
      return false
    }

    try {
      const response = await fetch('/api/unlock-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          password: passInput,
          locale: router.locale
        })
      })
      if (!response.ok) return false

      const unlockedPost = (await response.json())?.post
      if (!unlockedPost?.blockMap || activePostId.current !== post.id) {
        return false
      }

      setCurrentPost(unlockedPost)
      setLock(false)
      // 输入密码存入 localStorage；键仅含 pathname，避免 query/hash 导致读写不一致（PR #3389）
      rememberPasswordForPath(router.asPath, passInput)
      showNotification(locale.COMMON.ARTICLE_UNLOCK_TIPS) // 设置解锁成功提示显示
      return true
    } catch {
      return false
    }
  }

  // 文章加载
  useEffect(() => {
    // 文章加密
    setCurrentPost(post)
    setLock(Boolean(post?.password))

    // 读取上次记录 自动提交密码
    if (post?.password) {
      const tryStoredPasswords = async () => {
        const passInputs = getPasswordQuery(router.asPath)
        for (const passInput of passInputs) {
          if (await validPassword(passInput)) {
            break
          }
        }
      }
      void tryStoredPasswords()
    }
    // validPassword 内部依赖 post / router 同时也已在依赖里
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, router.asPath])

  // 文章加载
  useEffect(() => {
    if (lock) {
      return
    }
    // 文章解锁后生成目录与内容
    if (currentPost?.blockMap?.block) {
      currentPost.content = Object.keys(currentPost.blockMap.block).filter(
        key =>
          currentPost.blockMap.block[key]?.value?.parent_id === currentPost.id
      )
      currentPost.toc = getPageTableOfContents(
        currentPost,
        currentPost.blockMap
      )
    }
  }, [router, lock, currentPost])

  props = { ...props, post: currentPost, lock, validPassword }
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return (
    <>
      {/* 文章布局 */}
      <DynamicLayout theme={theme} layoutName='LayoutSlug' {...props} />
      {/* 解锁密码提示框 */}
      {post?.password && !lock && <Notification />}
      {/* 导流工具 */}
      <TechGrow lock={lock} />
    </>
  )
}

Slug.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string,
    slug: PropTypes.string,
    password: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    content: PropTypes.array,
    toc: PropTypes.array,
    blockMap: PropTypes.shape({
      block: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
    })
  }),
  NOTION_CONFIG: PropTypes.object
}

export async function getStaticPaths() {
  return getStaticPathsBase({
    from: 'slug-paths',
    filterFn: row => checkSlugHasNoSlash(row),
    mapPageToParams: row => ({ params: { prefix: row.slug } })
  })
}

export async function getStaticProps({ params: { prefix }, locale }) {
  const props = await resolvePostProps({
    prefix,
    locale
  })

  // 未找到文章时用短 revalidate：Notion 瞬时异常也会走到这里，
  // 若按 NEXT_REVALIDATE_SECOND（默认一天）缓存 404，真实文章会被长时间误判
  return {
    props,
    revalidate: isStaticExport
      ? undefined
      : props.post
        ? siteConfig(
            'NEXT_REVALIDATE_SECOND',
            BLOG.NEXT_REVALIDATE_SECOND,
            props.NOTION_CONFIG
          )
        : 60,
    notFound: !props.post
  }
}

export default Slug
