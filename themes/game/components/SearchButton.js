import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isAlgoliaSearchEnabled } from '@/lib/plugins/algoliaConfig'
import { useRouter } from 'next/router'
import { useGameGlobal } from '..'

/**
 * 搜索按钮
 * @returns
 */
export default function SearchButton(props) {
  const { locale } = useGlobal()
  const { searchModal } = useGameGlobal()
  const router = useRouter()
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
        alt={locale.NAV.SEARCH}
        className='cursor-pointer hover:bg-black hover:bg-opacity-10 rounded-full w-10 h-10 flex justify-center items-center duration-200 transition-all'>
        <i title={locale.NAV.SEARCH} className='fa-solid fa-magnifying-glass' />
      </div>
    </>
  )
}
