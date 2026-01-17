import { useGlobal } from '@/lib/global'
import SmartLink from '@/components/SmartLink'
import { useEffect, useRef } from 'react'
import Card from './Card'
import SearchInput from './SearchInput'
import TagItemMini from './TagItemMini'

/**
 * 搜索页面的导航
 * @param {*} props
 * @returns
 */
export default function SearchNav(props) {
  const { tagOptions, categoryOptions } = props
  const cRef = useRef(null)
  const { locale } = useGlobal()
  useEffect(() => {
    // 自动聚焦到搜索框
    cRef?.current?.focus()
  }, [])

  // 计算标签最大/最小计数，用于词云大小
  const maxCount = tagOptions?.length > 0 ? Math.max(...tagOptions.map(t => t.count)) : 1
  const minCount = tagOptions?.length > 0 ? Math.min(...tagOptions.map(t => t.count)) : 1

  return <>
    <div className="my-6 px-2">
        <SearchInput cRef={cRef} {...props} />
        {/* 分类 */}
        <Card className="w-full mt-4 bg-white dark:bg-[#1a191d]">
            <div className="dark:text-gray-200 mb-5 mx-3 text-2xl font-bold flex items-center">
                <i className="fas fa-th-large mr-2 text-blue-500"></i>
                {locale.COMMON.CATEGORY}
            </div>
            <div id="category-list" className="duration-200 flex flex-wrap gap-3 mx-4">
                {categoryOptions?.map(category => {
                  return (
                      <SmartLink
                          key={category.name}
                          href={`/category/${category.name}`}
                          passHref
                          legacyBehavior>
                          <div
                              className={
                                  'flex items-center gap-2 duration-300 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 cursor-pointer hover:bg-blue-600 hover:text-white dark:hover:bg-yellow-600 transition-all shadow-sm'
                              }
                          >
                              <i className="fas fa-folder text-blue-500 dark:text-yellow-500 group-hover:text-white" />
                              <span className="font-medium">{category.name}</span>
                              <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full">{category.count}</span>
                          </div>
                      </SmartLink>
                  )
                })}
            </div>
        </Card>

        {/* 标签词云 - 全站热词 */}
        <Card className="w-full mt-4 bg-white dark:bg-[#1a191d]">
            <div className="dark:text-gray-200 mb-5 mx-3 text-2xl font-bold flex items-center">
                <i className="fas fa-fire mr-2 text-red-500"></i>
                全站热词
            </div>
            <div id="tags-list" className="duration-200 flex flex-wrap gap-3 mx-4 justify-center items-center py-4">
                {tagOptions?.map(tag => {
                  // 计算字体大小 1rem - 2rem
                  const fontSize = 1 + ((tag.count - minCount) / (maxCount - minCount || 1)) * 1.5

                  return (
                    <SmartLink
                      key={tag.name}
                      href={`/tag/${encodeURIComponent(tag.name)}`}
                      className="cursor-pointer inline-block transition-all duration-300 hover:scale-110"
                    >
                      <span
                        style={{ fontSize: `${fontSize}rem`, opacity: 0.8 + (fontSize - 1) * 0.2 }}
                        className={`inline-block px-2 py-1 rounded-lg ${
                            tag.count > maxCount * 0.8 ? 'text-red-500 font-bold' :
                            tag.count > maxCount * 0.5 ? 'text-orange-500 font-medium' :
                            'text-blue-500 dark:text-blue-400'
                        } hover:text-white hover:bg-blue-500 dark:hover:bg-yellow-600 rounded transition-colors`}
                      >
                        {tag.name}
                        {tag.count > 1 && <sup className="ml-0.5 text-xs text-gray-400">{tag.count}</sup>}
                      </span>
                    </SmartLink>
                  )
                })}
            </div>
        </Card>
    </div>
</>
}
