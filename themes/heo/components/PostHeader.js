import { HashTag } from '@/components/HeroIcons'
import LazyImage from '@/components/LazyImage'
import NotionIcon from '@/components/NotionIcon'
import WordCount from '@/components/WordCount'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { formatDateFmt } from '@/lib/utils/formatDate'
import SmartLink from './HeoLink'
import WavesArea from './WavesArea'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'

const COVER_LOAD_TIMEOUT_MS = 1500

function getPostText(value, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join(' ') || fallback
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || fallback
  }
  return fallback
}

/**
 * 文章页头
 * @param {*} param0
 * @returns
 */
export default function PostHeader({ post, siteInfo, isDarkMode }) {
  const { setOnLoading } = useGlobal()
  const router = useRouter()
  const headerImage = post?.pageCover ? post.pageCover : siteInfo?.pageCover
  const pendingFontSizeRef = useRef(null)
  const fontSizeFrameRef = useRef(null)

  useEffect(() => {
    if (!post) return

    if (!headerImage) {
      setOnLoading(false)
      return
    }

    const timer = setTimeout(() => {
      setOnLoading(false)
    }, COVER_LOAD_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [headerImage, post, setOnLoading])

  useEffect(() => {
    return () => {
      if (fontSizeFrameRef.current) {
        window.cancelAnimationFrame(fontSizeFrameRef.current)
      }
    }
  }, [])

  if (!post) {
    return <></>
  }

  const ANALYTICS_BUSUANZI_ENABLE = siteConfig('ANALYTICS_BUSUANZI_ENABLE')
  const tagItems = Array.isArray(post?.tagItems)
    ? post.tagItems.filter(tag => tag?.name)
    : []
  const title = getPostText(post?.title, '未命名')
  const category = getPostText(post?.category)
  const publishDay = getPostText(post?.publishDay)
  const lastEditedDay = getPostText(post?.lastEditedDay)

  // 封面图加载完成或出错后隐藏加载指示器
  const handleCoverLoad = () => {
    setOnLoading(false)
  }

  const handleCoverError = () => {
    setOnLoading(false)
  }

  const searchInArticle = value => {
    const keyword = value?.trim()
    if (!keyword) {
      return
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('notionnext:article-search', {
          detail: { keyword }
        })
      )
    }

    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          keyword
        }
      },
      undefined,
      { shallow: true }
    )
  }

  const updateArticleFontSize = value => {
    pendingFontSizeRef.current = value
    if (fontSizeFrameRef.current) return

    fontSizeFrameRef.current = window.requestAnimationFrame(() => {
      fontSizeFrameRef.current = null
      const val = pendingFontSizeRef.current
      const article = document.getElementById('notion-article')
      if (!article) return

      article.style.fontSize = `${val}px`
      const notionElements = article.querySelectorAll('.notion')
      notionElements.forEach(element => {
        element.style.fontSize = `${val}px`
      })
    })
  }

  return (
    <div
      id='post-bg'
      className='md:mb-0 -mb-5 w-full h-[32rem] sm:h-[30rem] relative md:flex-shrink-0 overflow-hidden bg-cover bg-center bg-no-repeat z-10'
      style={{
        '--heo-post-bg-accent': isDarkMode
          ? 'var(--heo-color-accent)'
          : 'var(--heo-color-primary)'
      }}>
      <style jsx>{`
        .coverdiv:after {
          position: absolute;
          content: '';
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          box-shadow: 110px -130px 500px 100px var(--heo-post-bg-accent) inset;
        }
      `}</style>

      <div
        className='absolute top-0 w-full h-full py-10 flex justify-center items-center'
        style={{ backgroundColor: 'var(--heo-post-bg-accent)' }}>
        {/* 文章背景图 */}
        <div
          id='post-cover-wrapper'
          style={{
            filter: 'blur(15px)'
          }}
          className='coverdiv lg:opacity-50 lg:translate-x-96 lg:rotate-12'>
          <LazyImage
            id='post-cover'
            priority={true}
            width={1600}
            height={900}
            sizes='100vw'
            className='w-full h-full object-cover max-h-[50rem] min-w-[50vw] min-h-[20rem]'
            src={headerImage}
            onLoad={handleCoverLoad}
            onError={handleCoverError}
          />
        </div>

        {/* 文章文字描述 */}
        <div
          id='post-info'
          className='absolute top-40 sm:top-48 z-10 flex flex-col space-y-4 lg:-mt-12 w-full max-w-[86rem] px-5'>
          {/* 分类+标签 */}
          <div className='flex justify-center md:justify-start items-center gap-4'>
            {category && (
              <>
                <SmartLink
                  href={`/category/${encodeURIComponent(category)}`}
                  className='mr-4'>
                  <div className='cursor-pointer text-sm font-bold px-3 py-1 rounded-lg  hover:bg-white text-white bg-blue-500 dark:bg-yellow-500 hover:text-blue-500 duration-200 '>
                    {category}
                  </div>
                </SmartLink>
              </>
            )}

            {tagItems.length > 0 && (
              <div className='hidden md:flex justify-center flex-nowrap overflow-x-auto'>
                {tagItems.map((tag, index) => (
                  <SmartLink
                    key={index}
                    href={`/tag/${encodeURIComponent(tag.name)}`}
                    passHref
                    className={
                      'cursor-pointer inline-block text-gray-50 hover:text-white duration-200 py-0.5 px-1 whitespace-nowrap '
                    }>
                    <div className='font-light flex items-center'>
                      <HashTag className='text-gray-200 stroke-2 mr-0.5 w-3 h-3' />{' '}
                      {tag.name + (tag.count ? `(${tag.count})` : '')}{' '}
                    </div>
                  </SmartLink>
                ))}
              </div>
            )}
          </div>

          {/* 文章Title */}
          <div className='max-w-5xl mx-auto md:mx-0 font-bold text-2xl sm:text-3xl lg:text-5xl leading-tight md:leading-snug shadow-text-md flex justify-center md:justify-start text-center md:text-left text-white break-words'>
            {siteConfig('POST_TITLE_ICON') && (
              <NotionIcon icon={post.pageIcon} />
            )}
            {title}
          </div>

          {/* 标题底部补充信息 */}
          <section className='flex flex-wrap items-center gap-x-3 gap-y-2 dark:text-gray-200 text-opacity-70 shadow-text-md text-sm justify-center md:justify-start mt-4 text-white font-light leading-7'>
            <div className='flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-2 min-w-0'>
              <div className='whitespace-nowrap'>
                <WordCount
                  wordCount={post.wordCount}
                  readTime={post.readTime}
                />
              </div>
              {post?.type !== 'Page' && (
                <>
                  <SmartLink
                    href={`/archive#${formatDateFmt(post?.publishDate, 'yyyy-MM')}`}
                    passHref
                    className='cursor-pointer hover:underline whitespace-nowrap'>
                    <i className='fa-regular fa-calendar'></i> {publishDay}
                  </SmartLink>
                </>
              )}

              <div className='whitespace-nowrap'>
                <i className='fa-regular fa-calendar-check'></i> {lastEditedDay}
              </div>
            </div>

            {/* 阅读统计 */}
            {ANALYTICS_BUSUANZI_ENABLE && (
              <div className='busuanzi_container_page_pv font-light whitespace-nowrap'>
                <i className='fa-solid fa-fire-flame-curved'></i>{' '}
                <span className='mr-2 busuanzi_value_page_pv' />
              </div>
            )}

            {/* 字体大小调节 */}
            <div className='flex items-center justify-center gap-2 w-full sm:w-auto'>
              <i className='fa-solid fa-font text-xs' />
              <input
                type='range'
                min='14'
                max='24'
                defaultValue='18'
                step='1'
                className='w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700'
                onChange={e => {
                  updateArticleFontSize(e.target.value)
                }}
              />
              <i className='fa-solid fa-font' />
            </div>

            {/* 文章内搜索框 */}
            <div className='flex items-center justify-center w-full sm:w-auto'>
              <div className='relative group'>
                <input
                  type='text'
                  placeholder='在文中搜索...'
                  className='w-36 sm:w-32 focus:w-44 max-w-[calc(100vw-3rem)] transition-all duration-300 px-3 py-2 text-xs bg-gray-200 dark:bg-gray-700 rounded-lg outline-none text-gray-900 dark:text-gray-100'
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      searchInArticle(e.target.value)
                    }
                  }}
                />
                <button
                  type='button'
                  aria-label='在文中搜索'
                  className='fa-solid fa-magnifying-glass absolute right-3 top-2.5 text-gray-400 text-xs cursor-pointer'
                  onClick={e => {
                    const input = e.target.previousElementSibling
                    searchInArticle(input.value)
                  }}>
                  <span className='sr-only'>在文中搜索</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <WavesArea />
      </div>
    </div>
  )
}
