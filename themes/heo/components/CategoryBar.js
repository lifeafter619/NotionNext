import { ChevronDoubleLeft, ChevronDoubleRight } from '@/components/HeroIcons'
import { useGlobal } from '@/lib/global'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useRef, useState } from 'react'

/**
 * 博客列表上方嵌入条
 * @param {*} props
 * @returns
 */
export default function CategoryBar(props) {
  const { categoryOptions, border = true } = props
  const { locale } = useGlobal()
  const [scrollRight, setScrollRight] = useState(false)
  const safeCategoryOptions = Array.isArray(categoryOptions)
    ? categoryOptions.filter(category => category?.name)
    : []
  // 创建一个ref引用
  const categoryBarItemsRef = useRef(null)

  // 点击#right时，滚动#category-bar-items到最右边
  const handleToggleScroll = () => {
    if (categoryBarItemsRef.current) {
      const { scrollWidth, clientWidth } = categoryBarItemsRef.current
      if (scrollRight) {
        categoryBarItemsRef.current.scrollLeft = 0
      } else {
        categoryBarItemsRef.current.scrollLeft = scrollWidth - clientWidth
      }
      setScrollRight(!scrollRight)
    }
  }

  return (
    <div
      id='category-bar'
      className={`wow fadeInUp flex flex-nowrap justify-between items-center h-12 mb-4 space-x-2 w-full lg:bg-[var(--heo-color-card)] dark:lg:bg-[var(--heo-color-card-dark)]
            ${border ? 'lg:border lg:hover:border dark:lg:border-gray-800 hover:border-[var(--heo-color-border)] dark:hover:border-[var(--heo-color-border-dark)] ' : ''}  py-2 lg:px-2 rounded-xl transition-colors duration-200`}>
      <div
        id='category-bar-items'
        ref={categoryBarItemsRef}
        className='scroll-smooth max-w-4xl min-w-0 flex-1 rounded-lg scroll-hidden flex justify-start flex-nowrap items-center overflow-x-auto'>
        <MenuItem href='/' name={locale.NAV.INDEX} />
        {safeCategoryOptions.map((c, index) => (
          <MenuItem
            key={index}
            href={`/category/${encodeURIComponent(c.name)}`}
            name={c.name}
          />
        ))}
      </div>

      <div
        id='category-bar-next'
        className='flex shrink-0 items-center justify-center'>
        <div
          id='right'
          className='cursor-pointer w-11 h-11 flex items-center justify-center rounded-full dark:text-gray-300 dark:hover:text-yellow-600 hover:text-indigo-600 hover:bg-black/5 dark:hover:bg-white/10'
          onClick={handleToggleScroll}>
          {scrollRight ? (
            <ChevronDoubleLeft className={'w-5 h-5'} />
          ) : (
            <ChevronDoubleRight className={'w-5 h-5'} />
          )}
        </div>
        <SmartLink
          href='/category'
          className='hidden min-[375px]:inline whitespace-nowrap font-bold text-gray-900 dark:text-white transition-colors duration-200 hover:text-indigo-600 dark:hover:text-yellow-600'>
          {locale.MENU.CATEGORY}
        </SmartLink>
      </div>
    </div>
  )
}

/**
 * 按钮
 * @param {*} param0
 * @returns
 */
const MenuItem = ({ href, name }) => {
  const router = useRouter()
  const { category } = router.query
  const selected = category === name
  return (
    <div
      className={`whitespace-nowrap mr-2 min-h-11 flex items-center duration-200 transition-colors font-bold px-2 py-1 rounded-md text-gray-900 dark:text-white hover:text-white hover:bg-indigo-600 dark:hover:bg-yellow-600 ${selected ? 'text-white bg-indigo-600 dark:bg-yellow-600' : ''}`}>
      <SmartLink href={href}>{name}</SmartLink>
    </div>
  )
}
