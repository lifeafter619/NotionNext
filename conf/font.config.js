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
// 用 ?? 而非 ||：空字符串是显式"关闭默认字体"的合法取值，不能回退到默认值
const customFontUrls =
  process.env.NEXT_PUBLIC_FONT_URLS ?? process.env.NEXT_PUBLIC_FONT_URL

module.exports = {
  // START ************网站字体*****************
  // ['font-serif','font-sans'] 两种可选，分别是衬线和无衬线: 参考 https://www.jianshu.com/p/55e410bd2115
  // 后面空格隔开的font-light的字体粗细，留空是默认粗细；参考 https://www.tailwindcss.cn/docs/font-weight
  FONT_STYLE: process.env.NEXT_PUBLIC_FONT_STYLE || 'font-sans font-light',
  // 字体CSS 默认使用霞鹜文楷（已子集化、swap 异步加载，详见 _document.js）。
  // customFontUrls 为 undefined 时用默认；为空字符串时 parseList 返回 []，即关闭 Web Font。
  FONT_URL:
    customFontUrls !== undefined ? parseList(customFontUrls) : defaultFontUrls,

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
    '/vendor/fontawesome-subset/css/all.min.css' // font-awesome 字体图标地址。默认用 scripts/subset-fontawesome.js 生成的站点子集（36KB vs 全量 386KB）；新增图标后重跑该脚本。可回退 /vendor/fontawesome/css/all.min.css 全量版

  // END ************网站字体*****************
}
