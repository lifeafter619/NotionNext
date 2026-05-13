import replaceSearchResult from '@/components/Mark'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import algoliasearch from 'algoliasearch'
import throttle from 'lodash/throttle'
import SmartLink from '@/components/SmartLink'
import LazyImage from '@/components/LazyImage'
import { useRouter } from 'next/router'
import {
  Fragment,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

const ShortCutActions = [
  {
    key: '↑ ↓',
    action: '选择'
  },
  {
    key: 'Enter',
    action: '跳转'
  },
  {
    key: 'Esc',
    action: '关闭'
  }
]

// 搜索类型选项
const SEARCH_TYPES = [
  { id: 'all', label: '全部', icon: 'fa-globe' },
  { id: 'title', label: '标题', icon: 'fa-heading' },
  { id: 'content', label: '内容', icon: 'fa-file-alt' },
  { id: 'tags', label: '标签', icon: 'fa-tags' },
  { id: 'category', label: '分类', icon: 'fa-folder' }
]

// 排序选项
const SORT_OPTIONS = [
  { id: 'relevance', label: '相关度', icon: 'fa-star' },
  { id: 'newest', label: '最新', icon: 'fa-clock' },
  { id: 'oldest', label: '最早', icon: 'fa-history' }
]

/**
 * 结合 Algolia 实现的弹出式搜索框
 * 支持全文搜索、标题搜索、标签搜索、分类搜索
 * 支持按时间排序
 * 打开方式 cRef.current.openSearch()
 * https://www.algolia.com/doc/api-reference/search-api-parameters/
 */
export default function AlgoliaSearchModal({ cRef }) {
  const [searchResults, setSearchResults] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState(null)
  const [totalPage, setTotalPage] = useState(0)
  const [totalHit, setTotalHit] = useState(0)
  const [useTime, setUseTime] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  // 新增：搜索类型和排序状态
  const [searchType, setSearchType] = useState('all')
  const [sortOrder, setSortOrder] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)

  const inputRef = useRef(null)
  const router = useRouter()

  /**
   * 快捷键设置
   */
  useHotkeys('ctrl+k', e => {
    e.preventDefault()
    setIsModalOpen(true)
  })
  // 修改快捷键的使用逻辑
  useHotkeys(
    'down',
    e => {
      if (isInputFocused) {
        // 只有在聚焦时才触发
        e.preventDefault()
        if (activeIndex < searchResults.length - 1) {
          setActiveIndex(activeIndex + 1)
        }
      }
    },
    { enableOnFormTags: true }
  )
  useHotkeys(
    'up',
    e => {
      if (isInputFocused) {
        e.preventDefault()
        if (activeIndex > 0) {
          setActiveIndex(activeIndex - 1)
        }
      }
    },
    { enableOnFormTags: true }
  )
  useHotkeys(
    'esc',
    e => {
      if (isInputFocused) {
        e.preventDefault()
        setIsModalOpen(false)
      }
    },
    { enableOnFormTags: true }
  )
  useHotkeys(
    'enter',
    e => {
      if (isInputFocused && searchResults.length > 0) {
        onJumpSearchResult(index)
      }
    },
    { enableOnFormTags: true }
  )
  // 跳转Search结果
  const onJumpSearchResult = () => {
    if (searchResults.length > 0) {
      const searchResult = searchResults[activeIndex]
      if (!searchResult.slug && !searchResult.objectID) {
        return
      }
      window.location.href = `${siteConfig('SUB_PATH', '')}/${searchResult.slug || searchResult.objectID}?keyword=${encodeURIComponent(keyword)}`
    }
  }

  const resetSearch = () => {
    setActiveIndex(0)
    setKeyword('')
    setSearchResults([])
    setUseTime(0)
    setTotalPage(0)
    setTotalHit(0)
    setSearchType('all')
    setSortOrder('relevance')
    setShowFilters(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  /**
   * 页面路径变化后，自动关闭此modal
   */
  useEffect(() => {
    setIsModalOpen(false)
  }, [router])

  /**
   * 自动聚焦搜索框
   */
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } else {
      resetSearch()
    }
  }, [isModalOpen])

  /**
   * 对外暴露方法
   **/
  useImperativeHandle(cRef, () => {
    return {
      openSearch: () => {
        setIsModalOpen(true)
      }
    }
  })

  const client = algoliasearch(
    siteConfig('ALGOLIA_APP_ID'),
    siteConfig('ALGOLIA_SEARCH_ONLY_APP_KEY')
  )
  const index = client.initIndex(siteConfig('ALGOLIA_INDEX'))

  /**
   * 获取搜索配置参数
   * 根据搜索类型和排序设置返回Algolia搜索参数
   */
  const getSearchParams = (page) => {
    const params = {
      page,
      hitsPerPage: 10
    }

    // 根据搜索类型限制搜索属性
    switch (searchType) {
      case 'title':
        params.restrictSearchableAttributes = ['title']
        break
      case 'content':
        params.restrictSearchableAttributes = ['content', 'summary']
        break
      case 'tags':
        params.restrictSearchableAttributes = ['tags']
        break
      case 'category':
        params.restrictSearchableAttributes = ['category']
        break
      default:
        // 'all' - 搜索所有字段
        break
    }

    return params
  }

  /**
   * 对搜索结果进行排序
   * @param {Array} hits 搜索结果
   * @returns {Array} 排序后的结果
   */
  const sortResults = (hits) => {
    if (sortOrder === 'relevance') {
      return hits // Algolia默认按相关度排序
    }
    
    const sorted = [...hits]
    if (sortOrder === 'newest') {
      sorted.sort((a, b) => {
        const timeA = a.createdTimestamp || new Date(a.createdTime || 0).getTime()
        const timeB = b.createdTimestamp || new Date(b.createdTime || 0).getTime()
        return timeB - timeA
      })
    } else if (sortOrder === 'oldest') {
      sorted.sort((a, b) => {
        const timeA = a.createdTimestamp || new Date(a.createdTime || 0).getTime()
        const timeB = b.createdTimestamp || new Date(b.createdTime || 0).getTime()
        return timeA - timeB
      })
    }
    return sorted
  }

  /**
   * 搜索
   * 支持按类型过滤和按时间排序
   * @param {*} query
   */
  const handleSearch = async (query, page, currentSearchType = searchType, currentSortOrder = sortOrder) => {
    setKeyword(query)
    setPage(page)
    setSearchResults([])
    setUseTime(0)
    setTotalPage(0)
    setTotalHit(0)
    setActiveIndex(0)
    if (!query || query === '') {
      return
    }
    setIsLoading(true)
    try {
      const searchParams = getSearchParams(page)
      const res = await index.search(query, searchParams)
      const { hits, nbHits, nbPages, processingTimeMS } = res
      setUseTime(processingTimeMS)
      setTotalPage(nbPages)
      setTotalHit(nbHits)
      // 应用排序
      const sortedHits = sortResults(hits)
      setSearchResults(sortedHits)
      setIsLoading(false)
      const doms = document
        .getElementById('search-wrapper')
        .getElementsByClassName('replace')

      setTimeout(() => {
        replaceSearchResult({
          doms,
          search: query,
          target: {
            element: 'span',
            className: 'font-bold border-b border-dashed'
          }
        })
      }, 200) // 延时高亮
    } catch (error) {
      console.error('Algolia search error:', error)
      setIsLoading(false)
    }
  }

  // 使用 ref 追踪上一次的筛选条件，只在条件变化时触发搜索
  const prevFiltersRef = useRef({ searchType: 'all', sortOrder: 'relevance' })

  // 当搜索类型或排序改变时重新搜索
  // handleSearch 被有意排除在依赖数组外，因为我们只想在筛选条件变化时触发
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // 检查筛选条件是否真正发生变化
    const filtersChanged = 
      prevFiltersRef.current.searchType !== searchType || 
      prevFiltersRef.current.sortOrder !== sortOrder
    
    if (filtersChanged && keyword && isModalOpen) {
      handleSearch(keyword, 0, searchType, sortOrder)
    }
    
    // 更新 ref
    prevFiltersRef.current = { searchType, sortOrder }
  }, [searchType, sortOrder, keyword, isModalOpen])

  // 定义节流函数，确保在用户停止输入一段时间后才会调用处理搜索的方法
  const throttledHandleInputChange = useRef(
    throttle((query, page = 0) => {
      handleSearch(query, page)
    }, 1000)
  )

  // 用于存储搜索延迟的计时器
  const searchTimer = useRef(null)

  // 修改input的onChange事件处理函数
  const handleInputChange = e => {
    const query = e.target.value

    // 如果已经有计时器在等待搜索，先清除之前的计时器
    if (searchTimer.current) {
      clearTimeout(searchTimer.current)
    }

    // 设置新的计时器，在用户停止输入一段时间后触发搜索
    searchTimer.current = setTimeout(() => {
      throttledHandleInputChange.current(query)
    }, 800)
  }

  /**
   * 切换页码
   * @param {*} page
   */
  const switchPage = page => {
    handleSearch(keyword, page)
  }

  /**
   * 关闭弹窗
   */
  const closeModal = () => {
    setIsModalOpen(false)
  }

  if (!siteConfig('ALGOLIA_APP_ID')) {
    return <></>
  }
  return (
    <div
      id='search-wrapper'
      className={`${
        isModalOpen ? 'opacity-100' : 'invisible opacity-0 pointer-events-none'
      } z-30 fixed h-screen w-screen left-0 top-0 sm:mt-[5vh] flex items-start justify-center mt-0`}>
      {/* 模态框 - 增大宽度以容纳更多内容 */}
      <div
        className={`${
          isModalOpen ? 'opacity-100' : 'invisible opacity-0 translate-y-10'
        } max-h-[90vh] flex flex-col justify-between w-full min-h-[10rem] h-full md:h-fit max-w-2xl dark:bg-hexo-black-gray dark:border-gray-800 bg-white p-5 rounded-xl z-50 shadow-lg border hover:border-blue-600 duration-300 transition-all`}>
        {/* 头部 */}
        <div className='flex justify-between items-center mb-3'>
          <div className='text-2xl text-blue-600 dark:text-yellow-600 font-bold flex items-center gap-2'>
            <i className='fas fa-search'></i>
            高级搜索
          </div>
          <div className='flex items-center gap-2'>
            {/* 过滤器切换按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                showFilters 
                  ? 'bg-blue-600 dark:bg-yellow-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              <i className='fas fa-filter mr-1'></i>
              筛选
            </button>
            <i
              className='text-gray-600 fa-solid fa-xmark p-2 cursor-pointer hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all'
              onClick={closeModal}></i>
          </div>
        </div>

        {/* 搜索输入框 */}
        <div className='relative'>
          <input
            type='text'
            placeholder='搜索文章标题、内容、标签、分类...'
            onChange={e => handleInputChange(e)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className='text-black dark:text-gray-200 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-500 w-full pl-10 pr-4 py-3 border dark:border-gray-600 rounded-xl transition-all'
            ref={inputRef}
          />
          <i className='fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'></i>
          {isLoading && (
            <i className='fas fa-spinner animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 dark:text-yellow-500'></i>
          )}
        </div>

        {/* 搜索过滤器 */}
        {showFilters && (
          <div className='mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 animate-fade-in'>
            {/* 搜索类型 */}
            <div>
              <div className='text-sm font-medium text-gray-600 dark:text-gray-400 mb-2'>搜索范围</div>
              <div className='flex flex-wrap gap-2'>
                {SEARCH_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSearchType(type.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      searchType === type.id
                        ? 'bg-blue-600 dark:bg-yellow-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border dark:border-gray-600'
                    }`}>
                    <i className={`fas ${type.icon} text-xs`}></i>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            {/* 排序方式 */}
            <div>
              <div className='text-sm font-medium text-gray-600 dark:text-gray-400 mb-2'>排序方式</div>
              <div className='flex flex-wrap gap-2'>
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSortOrder(option.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      sortOrder === option.id
                        ? 'bg-blue-600 dark:bg-yellow-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border dark:border-gray-600'
                    }`}>
                    <i className={`fas ${option.icon} text-xs`}></i>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 热门标签 - 仅在无搜索结果时显示 */}
        {!keyword && (
          <div className='mt-4'>
            <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-2'>热门标签</div>
            <TagGroups />
          </div>
        )}

        {/* 无结果提示 */}
        {searchResults.length === 0 && keyword && !isLoading && (
          <div className='py-8 text-center'>
            <i className='fas fa-search text-4xl text-gray-300 dark:text-gray-600 mb-3'></i>
            <p className='text-gray-500 dark:text-gray-400'>
              未找到 <span className='font-semibold text-gray-700 dark:text-gray-200'>&quot;{keyword}&quot;</span> 的相关结果
            </p>
            <p className='text-sm text-gray-400 dark:text-gray-500 mt-1'>尝试使用不同的关键词或调整搜索范围</p>
          </div>
        )}

        {/* 搜索结果列表 - 改进样式，显示更多信息 */}
        <ul className='flex-1 overflow-auto mt-3 space-y-2'>
          {searchResults.map((result, index) => (
            <li
              key={result.objectID}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onJumpSearchResult(index)}
              className={`cursor-pointer replace p-3 duration-150 rounded-xl flex gap-3 group
              ${activeIndex === index 
                ? 'bg-blue-600 dark:bg-yellow-600 shadow-md' 
                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              {/* 封面图 - 使用 object-contain 保证图片完整显示 */}
              {result.pageCoverThumbnail && (
                <div className='w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center'>
                  <LazyImage
                    src={result.pageCoverThumbnail}
                    alt={result.title}
                    className='max-w-full max-h-full object-contain'
                  />
                </div>
              )}
              {/* 文章信息 */}
              <div className='flex-1 min-w-0'>
                <h3 className={`font-medium line-clamp-1 ${
                  activeIndex === index ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {result.title}
                </h3>
                {result.summary && (
                  <p className={`text-sm line-clamp-1 mt-0.5 ${
                    activeIndex === index ? 'text-blue-100 dark:text-yellow-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {result.summary}
                  </p>
                )}
                <div className={`flex items-center gap-2 mt-1 text-xs ${
                  activeIndex === index ? 'text-blue-200 dark:text-yellow-200' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {result.category && (
                    <span className='flex items-center gap-1'>
                      <i className='fas fa-folder'></i>
                      {result.category}
                    </span>
                  )}
                  {result.tags && result.tags.length > 0 && (
                    <span className='flex items-center gap-1'>
                      <i className='fas fa-tags'></i>
                      {result.tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                  {result.createdTime && (
                    <span className='flex items-center gap-1'>
                      <i className='fas fa-calendar'></i>
                      {new Date(result.createdTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {/* 箭头指示 */}
              <div className={`self-center transition-transform duration-200 ${
                activeIndex === index ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
              }`}>
                <i className={`fas fa-arrow-right ${activeIndex === index ? 'text-white' : ''}`}></i>
              </div>
            </li>
          ))}
        </ul>

        {/* 分页 */}
        <Pagination totalPage={totalPage} page={page} switchPage={switchPage} />

        {/* 底部信息 */}
        <div className='flex items-center justify-between mt-3 pt-3 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400'>
          {totalHit === 0 ? (
            <div className='flex items-center gap-3'>
              {ShortCutActions.map((action, index) => (
                <Fragment key={index}>
                  <div className='flex items-center gap-1'>
                    <kbd className='px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 font-mono text-xs'>
                      {action.key}
                    </kbd>
                    <span>{action.action}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          ) : (
            <p>
              共找到 <span className='font-medium text-blue-600 dark:text-yellow-500'>{totalHit}</span> 条结果，
              用时 <span className='font-medium'>{useTime}</span> 毫秒
            </p>
          )}
          <div className='flex items-center gap-1'>
            <i className='fa-brands fa-algolia text-blue-500'></i>
            <span>Algolia</span>
          </div>
        </div>
      </div>

      {/* 遮罩 */}
      <div
        onClick={closeModal}
        className='z-30 fixed top-0 left-0 w-full h-full flex items-center justify-center glassmorphism'
      />
    </div>
  )
}

/**
 * 标签组
 */
function TagGroups() {
  const { tagOptions } = useGlobal()
  //  获取tagOptions数组前十个
  const firstTenTags = tagOptions?.slice(0, 10)

  return (
    <div id='tags-group' className='dark:border-gray-700 space-y-2'>
      {firstTenTags?.map((tag, index) => {
        return (
          <SmartLink
            passHref
            key={index}
            href={`/tag/${encodeURIComponent(tag.name)}`}
            className={'cursor-pointer inline-block whitespace-nowrap'}>
            <div
              className={
                'flex items-center text-black dark:text-gray-300 hover:bg-blue-600 dark:hover:bg-yellow-600 hover:scale-110 hover:text-white rounded-lg px-2 py-0.5 duration-150 transition-all'
              }>
              <div className='text-lg'>{tag.name} </div>
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

/**
 * 分页
 * @param {*} param0
 */
function Pagination(props) {
  const { totalPage, page, switchPage } = props
  if (totalPage <= 0) {
    return <></>
  }
  return (
    <div className='flex space-x-1 w-full justify-center py-1'>
      {Array.from({ length: totalPage }, (_, i) => {
        const classNames =
          page === i
            ? 'font-bold text-white bg-blue-600 dark:bg-yellow-600 rounded'
            : 'hover:text-blue-600 hover:font-bold dark:text-gray-300'

        return (
          <div
            onClick={() => switchPage(i)}
            className={`text-center cursor-pointer w-6 h-6 ${classNames}`}
            key={i}>
            {i + 1}
          </div>
        )
      })}
    </div>
  )
}
