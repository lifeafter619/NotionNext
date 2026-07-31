import { siteConfig } from '@/lib/config'
import { loadExternalResource } from '@/lib/utils'
import { useEffect } from 'react'

/**
 * Artalk 自托管评论系统 @see https://artalk.js.org/
 * @returns {JSX.Element}
 * @constructor
 */

const Artalk = ({ siteInfo }) => {
  const artalkCss = siteConfig('COMMENT_ARTALK_CSS')
  const artalkServer = siteConfig('COMMENT_ARTALK_SERVER')
  const artalkLocale = siteConfig('LANG')
  const site = siteConfig('TITLE')

  useEffect(() => {
    let cancelled = false
    let observer

    const initArtalk = async () => {
      await loadExternalResource(artalkCss, 'css')
      if (cancelled) return
      const artalk = window?.Artalk?.init({
        server: artalkServer,
        el: '#artalk',
        locale: artalkLocale,
        site: site,
        darkMode: document.documentElement.classList.contains('dark')
      })

      observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.attributeName === 'class') {
            const isDark = document.documentElement.classList.contains('dark')
            artalk?.setDarkMode(isDark)
          }
        })
      })

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
    }

    void initArtalk().catch(error => {
      console.error('Artalk initialization failed:', error)
    })
    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [artalkCss, artalkLocale, artalkServer, site])

  return <div id='artalk'></div>
}

export default Artalk
