import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isAlgoliaSearchEnabled } from '@/lib/plugins/algoliaConfig'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useRef } from 'react'

const AlgoliaSearchModal = dynamic(
  () => import('@/components/AlgoliaSearchModal'),
  { ssr: false }
)

/**
 * 搜索按钮
 * @returns
 */
export default function SearchButton(props) {
  const { locale } = useGlobal()
  const router = useRouter()
  const searchModal = useRef(null)
  const algoliaEnabled = isAlgoliaSearchEnabled(siteConfig)

  function handleSearch() {
    if (algoliaEnabled) {
      searchModal.current?.openSearch()
    } else {
      router.push('/search')
    }
  }

  return (
    <>
      <div
        onClick={handleSearch}
        title={locale.NAV.SEARCH}
        role='button'
        aria-label={locale.NAV.SEARCH}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSearch()
          }
        }}
        className='cursor-pointer hover:bg-black hover:bg-opacity-10 rounded-full w-10 h-10 flex justify-center items-center duration-200 transition-all'>
        <i title={locale.NAV.SEARCH} className='fa-solid fa-magnifying-glass' />
      </div>
      <AlgoliaSearchModal cRef={searchModal} {...props} />
    </>
  )
}
