import { siteConfig } from '@/lib/config'
import dynamic from 'next/dynamic'

const ShareButtons = dynamic(() => import('@/components/ShareButtons'), {
  ssr: false
})

/**
 * 分享栏
 * @param {} param0
 * @returns
 */
const ShareBar = ({ post, className }) => {
  if (
    !JSON.parse(siteConfig('POST_SHARE_BAR_ENABLE')) ||
    !post ||
    post?.type !== 'Post'
  ) {
    return <></>
  }

  return (
    <div className='m-1 overflow-visible'>
      <div
        className={`flex w-full flex-wrap items-center gap-y-2 ${className || 'justify-start md:justify-end'}`}>
        <ShareButtons post={post} />
      </div>
    </div>
  )
}
export default ShareBar
