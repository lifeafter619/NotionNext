import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'
import { siteConfig } from '@/lib/config'

/**
 * Tabs切换标签
 * @param {*} param0
 * @returns
 */
const Tabs = ({ ariaLabel = 'Tabs', className, children }) => {
  const [currentTab, setCurrentTab] = useState(0)
  const tabsId = useId()
  const tabRefs = useRef([])

  const validChildren = []
  Children.forEach(children, child => {
    if (isValidElement(child)) {
      validChildren.push(child)
    }
  })

  useEffect(() => {
    if (currentTab >= validChildren.length) setCurrentTab(0)
  }, [currentTab, validChildren.length])

  if (validChildren.length === 0) {
    return <></>
  }

  const showTabList = !(
    validChildren.length === 1 && siteConfig('COMMENT_HIDE_SINGLE_TAB')
  )
  const getTabLabel = (item, index) =>
    item?.key == null ? `Tab ${index + 1}` : String(item.key)

  return (
    <div className={`mb-5 duration-200 ${className || ''}`}>
      {showTabList && (
        <div
          role='tablist'
          aria-label={ariaLabel}
          className='flex justify-center space-x-5 pb-4 dark:text-gray-400 text-gray-600 overflow-auto'>
          {validChildren.map((item, index) => (
            <button
              ref={element => {
                tabRefs.current[index] = element
              }}
              type='button'
              role='tab'
              id={`${tabsId}-tab-${index}`}
              aria-controls={`${tabsId}-panel-${index}`}
              aria-selected={currentTab === index}
              tabIndex={currentTab === index ? 0 : -1}
              key={item?.key ?? index}
              className={`${currentTab === index ? 'font-black border-b-2 border-red-600 text-red-600 animate__animated animate__jello' : 'font-extralight cursor-pointer'} text-sm font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
              onClick={() => setCurrentTab(index)}
              onKeyDown={event => {
                const lastIndex = validChildren.length - 1
                let nextIndex = null
                if (event.key === 'ArrowRight')
                  nextIndex = (index + 1) % validChildren.length
                if (event.key === 'ArrowLeft')
                  nextIndex =
                    (index - 1 + validChildren.length) % validChildren.length
                if (event.key === 'Home') nextIndex = 0
                if (event.key === 'End') nextIndex = lastIndex
                if (nextIndex === null) return
                event.preventDefault()
                setCurrentTab(nextIndex)
                tabRefs.current[nextIndex]?.focus()
              }}>
              {getTabLabel(item, index)}
            </button>
          ))}
        </div>
      )}
      {/* 标签切换的时候不销毁 DOM 元素，使用 CSS 样式进行隐藏 */}
      <div>
        {validChildren.map((item, index) => (
          <section
            key={item?.key ?? index}
            id={`${tabsId}-panel-${index}`}
            role='tabpanel'
            aria-labelledby={showTabList ? `${tabsId}-tab-${index}` : undefined}
            aria-label={showTabList ? undefined : getTabLabel(item, index)}
            hidden={currentTab !== index}
            className={currentTab === index ? 'opacity-100 static h-auto' : ''}>
            {item}
          </section>
        ))}
      </div>
    </div>
  )
}

export default Tabs
