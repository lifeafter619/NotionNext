import dynamic from 'next/dynamic'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'
import { isHeoCommentServiceConfigured } from '../utils/commentEnabled'
import { AnalyticsCard } from './AnalyticsCard'
import Card from './Card'
import Catalog from './Catalog'
import { InfoCard } from './InfoCard'
import LatestPostsGroupMini from './LatestPostsGroupMini'
import TagGroups from './TagGroups'
import TouchMeCard from './TouchMeCard'
import VisitorInfoCard from './VisitorInfoCard'
import { useArticleToc } from './useArticleToc'

const FaceBookPage = dynamic(
  () =>
    import('@/components/FacebookPage').catch(() => ({
      default: () => null
    })),
  { ssr: false }
)

const Live2D = dynamic(() => import('@/components/Live2D'), { ssr: false })

/**
 * Hexo主题右侧栏
 * @param {*} props
 * @returns
 */
export default function SideRight(props) {
  const { post, lock, tagOptions, currentTag, rightAreaSlot } = props
  const { fullWidth } = useGlobal()
  const toc = useArticleToc(post?.toc, Boolean(post) && !lock)
  const showLatestPosts = siteConfig(
    'HEO_WIDGET_LATEST_POSTS',
    true,
    CONFIG
  )
  const showAnalytics = siteConfig('HEO_WIDGET_ANALYTICS', true, CONFIG)
  const showCommentButton = Boolean(
    !fullWidth &&
      siteConfig('HEO_WIDGET_TO_COMMENT', true, CONFIG) &&
      isHeoCommentServiceConfigured()
  )

  // 只摘取标签的前60个，防止右侧过长
  const sortedTags = tagOptions?.slice(0, 60) || []

  return (
    <div
      id='sideRight'
      className='hidden xl:block w-72 flex-shrink-0 space-y-4 h-full overflow-visible'>
      <div className='pointer-events-auto'>
        <InfoCard {...props} className='w-72' />
      </div>

      <div id='sideRightSticky' className='sticky top-20 space-y-4'>
        {/* 访客信息卡片 */}
        <VisitorInfoCard />

        {/* 文章页显示目录（上锁文章不显示） */}
        {!lock && post && toc.length > 0 && (
          <div id='sideRightCatalog'>
            <Card className='bg-white dark:bg-[#1e1e1e] wow fadeInUp'>
              <Catalog toc={toc} showCommentButton={showCommentButton} />
            </Card>
          </div>
        )}

        {/* 联系交流群 */}
        <div>
          <TouchMeCard />
        </div>

        {/* 最新文章列表 */}
        {showLatestPosts && (
          <div
            className={
              'border hover:border-indigo-600  dark:hover:border-yellow-600 duration-200 dark:border-gray-700 dark:bg-[#1e1e1e] dark:text-white rounded-xl lg:p-6 p-4 hidden lg:block bg-white'
            }>
            <LatestPostsGroupMini {...props} />
          </div>
        )}

        {rightAreaSlot}

        <FaceBookPage />
        <Live2D />

        {/* 标签和成绩 */}
        <Card
          className={
            'bg-[var(--heo-color-card)] dark:bg-[var(--heo-color-card-dark)] dark:text-white hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] duration-200'
          }>
          <TagGroups tags={sortedTags} currentTag={currentTag} />
          {showAnalytics && (
            <>
              <hr className='mx-1 flex border-dashed relative my-4' />
              <AnalyticsCard {...props} />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
