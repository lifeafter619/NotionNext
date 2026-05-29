/**
 * 主题切换面板 — 集中配置（与 themes/<id> 目录名对应）
 *
 * 字段说明：
 * - name    展示名称（缺省则自动格式化为目录名的 Title Case）
 * - summary 简短简介，展示在卡片标题下方
 * - cover   预览图 URL（缺省 /images/themes-preview/<id>.png）
 * - coverWebp 可选；缺省 /images/themes-preview/<id>.webp，设为 '' 可跳过 webp 仅用 cover
 * - tier    可选；'free' | 'paid'，缺省为 'free'。面板展示对应标签，为后续付费主题预留。
 */

/** @type {Record<string, { name?: string, summary?: string, cover?: string, coverWebp?: string, tier?: 'free' | 'paid' }>} */
export const THEME_SWITCH_MANIFEST = {
  endspace: {
    name: 'Endspace',
    summary: '轻工业终末风，侧栏导航、悬浮控件与加载动画。'
  },
  next: {
    name: 'Next',
    summary: '经典双栏布局，右侧栏与移动端悬浮目录。'
  },
  simple: {
    name: 'Simple',
    summary: '极简清爽，适合文字为主的博客。'
  },
  medium: {
    name: 'Medium',
    summary: 'Medium 风格阅读体验与排版。'
  },
  matery: {
    name: 'Matery',
    summary: '卡片式列表与 Material 质感组件。'
  },
  heo: {
    name: 'Heo',
    summary: '致敬张洪Heo,丰富的 模块化组件。'
  },
  hexo: {
    name: 'Hexo',
    summary: '类 Hexo 经典博客结构与侧边栏。'
  },
  nobelium: {
    name: 'Nobelium',
    summary: '致敬Nobelium,极简排版风格。'
  },
  plog: {
    name: 'Plog',
    summary: '偏图片与轻量图文化展示。'
  },
  gitbook: {
    name: 'GitBook',
    summary: '文档与手册式侧栏目录结构。'
  },
  fuwari: {
    name: 'Fuwari',
    summary: '日系轻量双栏与主题色板。'
  },
  fukasawa: {
    name: 'Fukasawa',
    summary: '深川式多栏与侧边信息密度较高。'
  },
  typography: {
    name: 'Typography',
    summary: '排版优先，强调正文阅读与层级。'
  },
  nav: {
    name: 'Nav',
    summary: '顶部导航主导航的现代布局。'
  },
  starter: {
    name: 'Starter',
    summary: '落地页与区块化营销向模板。'
  },
  commerce: {
    name: 'Commerce',
    summary: '电商与商品展示向页面结构。'
  },
  magzine: {
    name: 'Magazine',
    summary: '杂志封面与大图列表风格。'
  },
  movie: {
    name: 'Movie',
    summary: '影视与海报墙式呈现。'
  },
  photo: {
    name: 'Photo',
    summary: '摄影作品与相册网格。'
  },
  game: {
    name: 'Game',
    summary: '偏游戏与像素元素装饰。'
  },
  example: {
    name: 'Example',
    summary: '示例与演示向默认骨架。'
  },
  proxio: {
    name: 'Proxio',
    summary: '作品集与个人品牌展示增强。'
  },
  landing: {
    name: 'Landing',
    summary: '单页着陆与分区滚动叙述。'
  },
  claude: {
    name: 'Claude',
    summary: '类 Claude Docs 的文档与终端氛围。'
  },
  thoughtlite: {
    name: 'ThoughtLite',
    summary: '轻阅读向时间线与 Latest 卡片，单列列表与文章卡片排版。'
  }
}

/**
 * @param {string} themeId themes 目录名
 * @returns {{ id: string, name: string, summary: string, coverPng: string, coverWebp: string | null, tier: 'free' | 'paid' }}
 */
export function getThemeSwitchMeta(themeId) {
  const id = themeId == null ? '' : String(themeId).trim()
  const row = THEME_SWITCH_MANIFEST[id] || {}

  const tier = row.tier === 'paid' ? 'paid' : 'free'

  const name =
    typeof row.name === 'string' && row.name.trim()
      ? row.name.trim()
      : formatThemeId(id)

  const summary =
    typeof row.summary === 'string' ? row.summary.trim() : ''

  const coverPng =
    typeof row.cover === 'string' && row.cover.trim()
      ? row.cover.trim()
      : `/images/themes-preview/${id}.png`

  let coverWebp = null
  if (row.coverWebp === '') {
    coverWebp = null
  } else if (typeof row.coverWebp === 'string' && row.coverWebp.trim()) {
    coverWebp = row.coverWebp.trim()
  } else {
    coverWebp = `/images/themes-preview/${id}.webp`
  }

  return { id, name, summary, coverPng, coverWebp, tier }
}

export function formatThemeId(id) {
  const s = id == null ? '' : String(id).trim()
  if (!s) return ''
  return s
    .split(/[-_]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
