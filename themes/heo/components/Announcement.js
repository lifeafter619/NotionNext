import NotionPage from '@/components/NotionPage'

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
