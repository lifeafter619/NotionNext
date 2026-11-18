import dynamic from 'next/dynamic'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'
import { isHeoCommentServiceConfigured } from '../utils/commentEnabled'
import Card from './Card'
import Catalog from './Catalog'
import { InfoCard } from './InfoCard'
import { useArticleToc } from './useArticleToc'
import { useEffect, useState } from 'react'

const SideRightDeferred = dynamic(() => import('./SideRightDeferred'), {
  ssr: false
})

/**
 * Hexo主题右侧栏
 * @param {*} props
 * @returns
 */
export default function SideRight(props) {
  const { post, lock } = props
  const { fullWidth } = useGlobal()
  const toc = useArticleToc(post?.toc, Boolean(post) && !lock)
  const [showDeferred, setShowDeferred] = useState(false)
  const showCommentButton = Boolean(
    !fullWidth &&
      siteConfig('HEO_WIDGET_TO_COMMENT', true, CONFIG) &&
      isHeoCommentServiceConfigured()
  )

  useEffect(() => {
    let idleId = null
    let timerId = null
    const show = () => setShowDeferred(true)

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(show, { timeout: 1500 })
    } else {
      timerId = setTimeout(show, 0)
    }

    return () => {
      clearTimeout(timerId)
      if (idleId !== null) window.cancelIdleCallback?.(idleId)
    }
  }, [])

  return (
    <div
      id='sideRight'
      className='hidden xl:block w-72 flex-shrink-0 space-y-4 h-full overflow-visible'>
      <div className='pointer-events-auto'>
        <InfoCard {...props} className='w-72' />
      </div>

      <div id='sideRightSticky' className='sticky top-20 space-y-4'>
        {/* 文章页显示目录（上锁文章不显示） */}
        {!lock && post && toc.length > 0 && (
          <div id='sideRightCatalog'>
            <Card className='bg-white dark:bg-[#1e1e1e] wow fadeInUp'>
              <Catalog toc={toc} showCommentButton={showCommentButton} />
            </Card>
          </div>
        )}
        {showDeferred && <SideRightDeferred {...props} />}
      </div>
    </div>
  )
}
