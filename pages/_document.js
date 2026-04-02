// eslint-disable-next-line @next/next/no-document-import-in-page
import BLOG from '@/blog.config'
import Document, { Head, Html, Main, NextScript } from 'next/document'

// 预先设置深色模式的脚本内容
const darkModeScript = `
(function() {
  const darkMode = localStorage.getItem('darkMode')

  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  const defaultAppearance = '${BLOG.APPEARANCE || 'auto'}'

  let shouldBeDark = darkMode === 'true' || darkMode === 'dark'

  if (darkMode === null) {
    if (defaultAppearance === 'dark') {
      shouldBeDark = true
    } else if (defaultAppearance === 'auto') {
      // 检查是否在深色模式时间范围内
      const date = new Date()
      const hours = date.getHours()
      const darkTimeStart = ${BLOG.APPEARANCE_DARK_TIME ? BLOG.APPEARANCE_DARK_TIME[0] : 18}
      const darkTimeEnd = ${BLOG.APPEARANCE_DARK_TIME ? BLOG.APPEARANCE_DARK_TIME[1] : 6}
      
      shouldBeDark = prefersDark || (hours >= darkTimeStart || hours < darkTimeEnd)
    }
  }
  
  // 立即设置 html 元素的类
  document.documentElement.classList.add(shouldBeDark ? 'dark' : 'light')
})()
`

// 获取字体URL列表
const fontUrls = BLOG.FONT_URL || []

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html lang={BLOG.LANG}>
        <Head>
          {/* DNS预解析 - 加速字体加载 */}
          <link rel='dns-prefetch' href='//fonts.googleapis.com' />
          <link rel='dns-prefetch' href='//fonts.gstatic.com' />
          <link rel='dns-prefetch' href='//npm.elemecdn.com' />
          <link rel='dns-prefetch' href='//cdnjs.cloudflare.com' />
          
          {/* 预连接 - 提前建立连接 */}
          <link rel='preconnect' href='https://fonts.googleapis.com' crossOrigin='anonymous' />
          <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
          <link rel='preconnect' href='https://npm.elemecdn.com' crossOrigin='anonymous' />

          {/* 预加载字体样式表 */}
          {fontUrls.filter(url => url).map((url, index) => (
            <link
              key={`preload-font-${index}`}
              rel='preload'
              href={url}
              as='style'
              crossOrigin='anonymous'
            />
          ))}

          {/* 加载字体样式表 */}
          {fontUrls.filter(url => url).map((url, index) => (
            <link
              key={`font-${index}`}
              rel='stylesheet'
              href={url}
              crossOrigin='anonymous'
            />
          ))}

          {/* 预加载 Font Awesome */}
          {BLOG.FONT_AWESOME && (
            <>
              <link
                rel='preload'
                href={BLOG.FONT_AWESOME}
                as='style'
                crossOrigin='anonymous'
              />
              <link
                rel='stylesheet'
                href={BLOG.FONT_AWESOME}
                crossOrigin='anonymous'
                referrerPolicy='no-referrer'
              />
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
