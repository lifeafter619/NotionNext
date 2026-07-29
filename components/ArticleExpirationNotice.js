import { siteConfig } from '@/lib/config'
import { formatDateFmt } from '@/lib/utils/formatDate'

/**
 * 文章过期提醒组件
 * 当文章超过指定天数时显示提醒
 * @param {Object} props - 组件属性
 * @param {Object} props.post - 文章数据
 * @param {number} [props.daysThreshold=90] - 过期阈值（天）
 * @returns {JSX.Element|null}
 */
export default function ArticleExpirationNotice({
  post,
  daysThreshold = siteConfig('ARTICLE_EXPIRATION_DAYS', 90)
}) {
  const articleExpirationEnabled = siteConfig(
    'ARTICLE_EXPIRATION_ENABLED',
    false
  )
  if (!articleExpirationEnabled || !post?.lastEditedDay) {
    return null
  }

  const postDate = new Date(post.lastEditedDay)
  const today = new Date()
  const diffTime = Math.abs(today - postDate)
  const daysOld = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const isVisible = daysOld >= daysThreshold

  if (!isVisible) {
    return null
  }

  // 使用 %%DAYS%% 作为占位符
  const articleExpirationMessage = siteConfig(
    'ARTICLE_EXPIRATION_MESSAGE',
    '这篇文章发布于 %%DAYS%% 天前，内容可能已过时，请谨慎参考。'
  )
  const articleExpirationMessageParts =
    articleExpirationMessage.split('%%DAYS%%')

  // 解析最后更新时间，用于在文案末尾追加具体日期 (2026-1-1,12:00)
  // 优先用带时间信息的 lastEditedDate；若缺失则降级为仅含日期的 lastEditedDay
  const editedTimestamp = post?.lastEditedDate ?? post?.lastEditedDay
  const editedDate = editedTimestamp ? new Date(editedTimestamp) : null
  const hasValidEditedDate = editedDate && !isNaN(editedDate.getTime())
  // 形如 2026-1-1,12:00
  const editedDateText = hasValidEditedDate
    ? formatDateFmt(editedDate, 'yyyy-M-d,HH:mm')
    : ''

  // 直接返回 JSX 内容
  return (
    <div
      className={
        'p-4 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200 shadow-sm'
      }>
      {/* 标题行：图标 + 标题独占一行，避免移动端正文被大图标挤压 */}
      <div className='flex items-center'>
        <i className='fas fa-exclamation-triangle text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0' />
        <div className='text-blue-600 dark:text-blue-400 font-medium'>
          {siteConfig('ARTICLE_EXPIRATION_TITLE', '温馨提醒')}
        </div>
      </div>
      {/* 正文行：独占整行宽度，移动端不再因图标留白而拥挤 */}
      <div className='mt-2 flex items-start text-sm text-gray-700 dark:text-gray-300'>
        <i className='far fa-clock text-red-500 dark:text-red-400 mr-1 mt-0.5 flex-shrink-0' />
        <span className='leading-relaxed'>
          {(() => {
            return (
              <>
                {articleExpirationMessageParts[0]}
                <span className='text-red-500 dark:text-red-400 font-bold'>
                  {daysOld}
                </span>
                {articleExpirationMessageParts[1]}
                {hasValidEditedDate && (
                  <span className='text-red-500 dark:text-red-400 font-bold'>
                    （{editedDateText}）
                  </span>
                )}
              </>
            )
          })()}
        </span>
      </div>
    </div>
  )
}
