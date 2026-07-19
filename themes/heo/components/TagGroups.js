import SmartLink from './HeoLink'
import { useRouter } from 'next/router'

/**
 * 标签组
 * @param tags
 * @param currentTag
 * @returns {JSX.Element}
 * @constructor
 */
const TagGroups = ({ tags, className }) => {
  const router = useRouter()
  const { tag: currentTag } = router.query
  const safeTags = Array.isArray(tags) ? tags.filter(tag => tag?.name) : []
  if (safeTags.length === 0) return <></>

  return (
    <div id='tags-group' className='dark:border-gray-700 flex flex-wrap gap-2'>
      {safeTags.map((tag, index) => {
        const selected = currentTag === tag.name
        return (
          <SmartLink
            passHref
            key={index}
            href={`/tag/${encodeURIComponent(tag.name)}`}
            className='cursor-pointer inline-block whitespace-nowrap'>
            <div
              className={`${className || ''}
                            ${selected ? 'text-white bg-blue-600 dark:bg-yellow-600' : ''}
                            min-h-9 flex items-center hover:bg-blue-600 dark:hover:bg-yellow-600 hover:text-white rounded-lg px-2 py-1 duration-150 transition-colors`}>
              <div className='text-base'>{tag.name} </div>
              {tag.count ? (
                <sup className='relative ml-1'>{tag.count}</sup>
              ) : (
                <></>
              )}
            </div>
          </SmartLink>
        )
      })}
    </div>
  )
}

export default TagGroups
