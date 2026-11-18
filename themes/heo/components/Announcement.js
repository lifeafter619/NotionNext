import dynamic from 'next/dynamic'

// 与其他主题保持一致：NotionPage 走动态加载。
// 静态引入会把 react-notion-x 拉进 SideRight 的 chunk 图，
// 导致公告未展示时也下载整套渲染器。
const NotionPage = dynamic(() => import('@/components/NotionPage'))

const Announcement = ({ post }) => {
  if (post?.blockMap) {
    return (
      <div>
        {post && (
          <div
            id='announcement-content'
            className='[&_img]:pointer-events-none'>
            <NotionPage post={post} contentId='heo-announcement' />
          </div>
        )}
      </div>
    )
  } else {
    return <></>
  }
}
export default Announcement
