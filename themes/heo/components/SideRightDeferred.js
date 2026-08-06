import dynamic from 'next/dynamic'
import { siteConfig } from '@/lib/config'
import CONFIG from '../config'
import { AnalyticsCard } from './AnalyticsCard'
import Card from './Card'
import LatestPostsGroupMini from './LatestPostsGroupMini'
import TagGroups from './TagGroups'
import TouchMeCard from './TouchMeCard'
import VisitorInfoCard from './VisitorInfoCard'

const FaceBookPage = dynamic(
  () =>
    import('@/components/FacebookPage').catch(() => ({
      default: () => null
    })),
  { ssr: false }
)
const Live2D = dynamic(() => import('@/components/Live2D'), { ssr: false })

export default function SideRightDeferred(props) {
  const { tagOptions, currentTag, rightAreaSlot } = props
  const showLatestPosts = siteConfig(
    'HEO_WIDGET_LATEST_POSTS',
    true,
    CONFIG
  )
  const showAnalytics = siteConfig('HEO_WIDGET_ANALYTICS', true, CONFIG)
  const sortedTags = tagOptions?.slice(0, 60) || []

  return (
    <>
      <VisitorInfoCard />
      <TouchMeCard />

      {showLatestPosts && (
        <div className='border hover:border-indigo-600 dark:hover:border-yellow-600 duration-200 dark:border-gray-700 dark:bg-[#1e1e1e] dark:text-white rounded-xl lg:p-6 p-4 hidden lg:block bg-white'>
          <LatestPostsGroupMini {...props} />
        </div>
      )}

      {rightAreaSlot}
      <FaceBookPage />
      <Live2D />

      <Card className='bg-[var(--heo-color-card)] dark:bg-[var(--heo-color-card-dark)] dark:text-white hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] duration-200'>
        <TagGroups tags={sortedTags} currentTag={currentTag} />
        {showAnalytics && (
          <>
            <hr className='mx-1 flex border-dashed relative my-4' />
            <AnalyticsCard {...props} />
          </>
        )}
      </Card>
    </>
  )
}
