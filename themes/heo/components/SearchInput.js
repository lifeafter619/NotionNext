import { useRouter } from 'next/router'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useGlobal } from '@/lib/global'
import { withHeoSubPath } from '../utils/path'

const SearchInput = props => {
  const { currentSearch, cRef, className } = props
  const [onLoading, setLoadingState] = useState(false)
  const [searchText, setSearchText] = useState(currentSearch || '')
  const [showClean, setShowClean] = useState(Boolean(currentSearch))
  const router = useRouter()
  const searchInputRef = useRef()
  const { locale } = useGlobal()
  // 输入法组合期锁定 — 用 useRef 持有，避免使用模块级变量在 SSR
  // 多请求 / 多实例间互相污染（之前 `let lock = false` 是模块作用域）。
  const lockRef = useRef(false)

  useEffect(() => {
    setSearchText(currentSearch || '')
    setShowClean(Boolean(currentSearch))
  }, [currentSearch])

  useImperativeHandle(cRef, () => {
    return {
      focus: () => {
        searchInputRef?.current?.focus()
      }
    }
  })

  const handleSearch = () => {
    const key = searchInputRef.current.value?.trim()
    if (key && key !== '') {
      setLoadingState(true)
      router
        .push({
          pathname: withHeoSubPath('/search/' + encodeURIComponent(key))
        })
        .finally(() => {
          setLoadingState(false)
        })
      // location.href = '/search/' + key
    } else {
      router.push({ pathname: withHeoSubPath('/') }).then(r => {})
    }
  }
  const handleKeyDown = e => {
    if (
      (e.key === 'Enter' || e.keyCode === 13) &&
      !e.nativeEvent?.isComposing &&
      !lockRef.current
    ) {
      // 回车
      e.preventDefault()
      handleSearch()
    } else if (e.key === 'Escape' || e.keyCode === 27) {
      // ESC
      cleanSearch()
    }
  }
  const cleanSearch = () => {
    setSearchText('')
    setShowClean(false)
  }

  const updateSearchKey = val => {
    setSearchText(val)
    if (lockRef.current) {
      return
    }

    if (val) {
      setShowClean(true)
    } else {
      setShowClean(false)
    }
  }
  function lockSearchInput() {
    lockRef.current = true
  }

  function unLockSearchInput() {
    lockRef.current = false
    setShowClean(Boolean(searchInputRef.current?.value))
  }

  return (
    <div className={'relative flex w-full rounded-lg ' + className}>
      <input
        ref={searchInputRef}
        type='text'
        aria-label={locale.SEARCH.ARTICLES}
        className={
          'outline-none w-full text-sm pl-5 pr-24 rounded-xl transition focus:shadow-lg font-normal leading-10 text-black dark:text-white bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-yellow-500 shadow-sm'
        }
        onKeyDown={handleKeyDown}
        onCompositionStart={lockSearchInput}
        onCompositionUpdate={lockSearchInput}
        onCompositionEnd={unLockSearchInput}
        placeholder={locale.SEARCH.ARTICLES}
        onChange={e => updateSearchKey(e.target.value)}
        value={searchText}
      />

      <div className='absolute right-1 top-1 bottom-1 flex items-center'>
        {showClean && (
          <button
            type='button'
            className='flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
            onClick={cleanSearch}
            aria-label='清空搜索'>
            <i className='fas fa-times' aria-hidden='true' />
          </button>
        )}
        <button
          type='button'
          disabled={onLoading}
          aria-busy={onLoading}
          className='flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'
          onClick={handleSearch}
          aria-label='提交搜索'>
          <i
            className={`fas ${
              onLoading ? 'fa-spinner animate-spin' : 'fa-search'
            }`}
            aria-hidden='true'
          />
        </button>
      </div>
    </div>
  )
}

export default SearchInput
