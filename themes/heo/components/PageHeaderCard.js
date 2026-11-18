/**
 * Heo 索引页共用页头卡片（归档/分类/标签）
 * 设计语言：白卡片 + 扁平图标徽章（muted 底 + 主色图标）+ 大标题 + 统计副标题
 * @param {object} props
 * @param {string} props.icon FontAwesome class，如 'fas fa-archive'
 * @param {*} props.title 页面标题
 * @param {*} [props.subtitle] 统计副标题（可选）
 */
const PageHeaderCard = ({ icon, title, subtitle }) => {
  return (
    <div className='wow fadeInUp w-full rounded-xl border bg-white dark:bg-[#1e1e1e] dark:border-gray-600 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] p-6 mb-4 transition-colors duration-300'>
      <div className='flex items-center gap-4'>
        {icon && (
          <div className='flex-shrink-0 w-12 h-12 rounded-lg bg-[#f1f3f8] dark:bg-gray-800 flex items-center justify-center'>
            <i
              className={`${icon} text-xl text-[var(--heo-color-primary)] dark:text-[var(--heo-color-accent)]`}
            />
          </div>
        )}
        <div className='min-w-0'>
          <h1 className='text-2xl font-extrabold text-black dark:text-gray-100 leading-tight'>
            {title}
          </h1>
          {subtitle && (
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1 truncate'>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PageHeaderCard
