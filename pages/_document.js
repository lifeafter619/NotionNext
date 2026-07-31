import BLOG from '@/blog.config'
import Document, { Head, Html, Main, NextScript } from 'next/document'

const normalizeResourceList = value => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return [value].filter(Boolean)
}

const getUrlOrigin = value => {
  if (!value || String(value).startsWith('/')) return null
  try {
    return new URL(value).origin
  } catch (_) {
    return null
  }
}

// 预先设置深色模式的脚本内容
export const darkModeScript = `
(function() {
  let savedMode = null
  try {
    savedMode = localStorage.getItem('darkMode')
  } catch (err) {}

  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  const normalizeMode = function(value) {
    if (value === true || value === 'true' || value === 'dark') return 'dark'
    if (value === false || value === 'false' || value === 'light') return 'light'
    if (value === 'auto' || value === 'system') return 'system'
    return null
  }

  const queryMode = normalizeMode(
    new URLSearchParams(window.location.search).get('mode')
  )
  const defaultAppearance = normalizeMode(${JSON.stringify(
    BLOG.APPEARANCE || 'system'
  )}) || 'system'
  const appearanceMode =
    queryMode || normalizeMode(savedMode) || defaultAppearance
  const shouldBeDark =
    appearanceMode === 'dark' ||
    (appearanceMode === 'system' && prefersDark)

  // 立即设置 html 元素的类
  document.documentElement.classList.remove('dark', 'light')
  document.documentElement.classList.add(shouldBeDark ? 'dark' : 'light')
})()
`

// 获取字体URL列表
const fontUrls = normalizeResourceList(BLOG.FONT_URL)
const resourceOrigins = [
  getUrlOrigin(BLOG.NOTION_HOST),
  'https://images.unsplash.com',
  ...fontUrls.map(getUrlOrigin),
  getUrlOrigin(BLOG.FONT_AWESOME),
  getUrlOrigin(BLOG.BLOG_FAVICON)
].filter(Boolean)
const preconnectOrigins = [...new Set(resourceOrigins)]

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html lang={BLOG.LANG}>
        <Head>
          {/* Keep image requests domain-agnostic and compatible with CDNs that
              enable generic hotlink protection. */}
          <meta name='referrer' content='no-referrer' />
          {preconnectOrigins.map(origin => (
            <link key={`preconnect-${origin}`} rel='preconnect' href={origin} />
          ))}
          <link rel='dns-prefetch' href='//images.unsplash.com' />

          {/* 网页字体在 load 后的空闲时段启用：首屏先用系统字体，
              避免中文字体子集与 LCP 图片争抢带宽。 */}
          {fontUrls.map((url, index) => (
            <link
              key={`font-css-${index}`}
              id={`web-font-css-${index}`}
              rel='preload'
              as='style'
              href={url}
            />
          ))}
          {fontUrls.length > 0 && (
            <>
              <script
                dangerouslySetInnerHTML={{
                  __html:
                    "(function(){var a=function(){for(var i=0;;i++){var l=document.getElementById('web-font-css-'+i);if(!l)break;l.rel='stylesheet'}};var s=function(){if(window.requestIdleCallback){requestIdleCallback(a,{timeout:3000})}else{setTimeout(a,1500)}};if(document.readyState==='complete'){s()}else{window.addEventListener('load',s,{once:true})}})()"
                }}
              />
              <noscript>
                {fontUrls.map((url, index) => (
                  <link
                    key={`font-noscript-${index}`}
                    rel='stylesheet'
                    href={url}
                  />
                ))}
              </noscript>
            </>
          )}

          {/* Font Awesome 推迟到 load 后激活：其 font-display:block 决定了
              字体到达前图标本来就是空白，提前激活只会让 ~280KB 字体
              抢占首屏图片与 CSS 的带宽 */}
          {BLOG.FONT_AWESOME && (
            <>
              <style
                dangerouslySetInnerHTML={{
                  __html:
                    '.fa,.fas,.far,.fab,.fa-solid,.fa-regular,.fa-brands{display:inline-flex;width:1.25em;min-width:1.25em;height:1em;align-items:center;justify-content:center;text-align:center;line-height:1}'
                }}
              />
              <link
                id='font-awesome-css'
                rel='preload'
                as='style'
                href={BLOG.FONT_AWESOME}
              />
              <script
                dangerouslySetInnerHTML={{
                  __html:
                    "(function(){var a=function(){var l=document.getElementById('font-awesome-css');if(l)l.rel='stylesheet'};var i=function(){if(window.requestIdleCallback){requestIdleCallback(a,{timeout:2000})}else{setTimeout(a,1)}};if(document.readyState==='complete'){i()}else{window.addEventListener('load',i)}})()"
                }}
              />
              <noscript>
                <link rel='stylesheet' href={BLOG.FONT_AWESOME} />
              </noscript>
            </>
          )}

          {/* 预先设置深色模式，避免闪烁 */}
          <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
