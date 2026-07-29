/**
 * 网站字体相关配置
 *
 */
const parseList = value => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)

  const text = String(value).trim()
  if (!text) return []

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch (_) {}
  }

  return text
    .split(',')
    .map(url => url.trim())
    .filter(Boolean)
}

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  return String(value).toLowerCase() === 'true'
}

// 默认加载霞鹜文楷（已做 unicode-range 子集化，浏览器只按需下载页面实际渲染
// 字符的 woff2 子集，单页典型 100-200KB；首屏仍走系统字体 swap，不阻塞渲染）。
// 如需关闭默认 Web Font 只用系统字体，设 NEXT_PUBLIC_FONT_URLS 为空字符串即可。
// 如需换用其它 Web Font，在 Vercel 设置 NEXT_PUBLIC_FONT_URLS，多个 URL 用英文逗号分隔，也支持 JSON 数组。
const defaultFontUrls = [
  'https://npm.elemecdn.com/lxgw-wenkai-webfont@1.7.0/style.css'
]
const customFontUrls =
  process.env.NEXT_PUBLIC_FONT_URLS || process.env.NEXT_PUBLIC_FONT_URL

module.exports = {
  // START ************网站字体*****************
  // ['font-serif','font-sans'] 两种可选，分别是衬线和无衬线: 参考 https://www.jianshu.com/p/55e410bd2115
  // 后面空格隔开的font-light的字体粗细，留空是默认粗细；参考 https://www.tailwindcss.cn/docs/font-weight
  FONT_STYLE: process.env.NEXT_PUBLIC_FONT_STYLE || 'font-sans font-light',
  // 字体CSS 默认使用霞鹜文楷（已子集化、swap 异步加载，详见 _document.js）。
  FONT_URL: customFontUrls ? parseList(customFontUrls) : defaultFontUrls,

  // 字体优化配置
  FONT_DISPLAY: process.env.NEXT_PUBLIC_FONT_DISPLAY || 'swap',
  FONT_PRELOAD: parseBoolean(process.env.NEXT_PUBLIC_FONT_PRELOAD, true),
  FONT_SUBSET: process.env.NEXT_PUBLIC_FONT_SUBSET || 'chinese-simplified',
  // 无衬线字体 例如'"LXGW WenKai"'
  FONT_SANS: [
    '"LXGW WenKai"',
    '"PingFang SC"',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Hiragino Sans GB"',
    '"Microsoft YaHei"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Segoe UI"',
    '"Noto Sans SC"',
    'HarmonyOS_Regular',
    '"Helvetica Neue"',
    'Helvetica',
    '"Source Han Sans SC"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"'
  ],
  // 衬线字体 例如'"LXGW WenKai"'
  FONT_SERIF: [
    '"LXGW WenKai"',
    'Bitter',
    '"Noto Serif SC"',
    'SimSun',
    '"Times New Roman"',
    'Times',
    'serif',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Apple Color Emoji"'
  ],
  FONT_AWESOME:
    process.env.NEXT_PUBLIC_FONT_AWESOME_PATH ||
    '/vendor/fontawesome/css/all.min.css' // font-awesome 字体图标地址; 可选 /css/all.min.css ， https://lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/font-awesome/6.0.0/css/all.min.css

  // END ************网站字体*****************
}
