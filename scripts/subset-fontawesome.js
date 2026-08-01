#!/usr/bin/env node
/**
 * FontAwesome 子集化：只保留站点实际用到的图标，生成
 *   public/vendor/fontawesome-subset/css/all.min.css
 *   public/vendor/fontawesome-subset/webfonts/*.woff2
 *
 * 全量 FA6：CSS 102KB + 字体 284KB；站点实际只用 ~100 个图标。
 *
 * 图标来源（并集）：
 *   1. 代码扫描：themes/heo、components、conf、lib、pages、blog.config.js
 *      里出现的 fa-xxx 类名（其它主题未部署，不计入）
 *   2. scripts/fontawesome-live-icons.json：线上全站爬取到的类名，
 *      覆盖 Notion 配置驱动的菜单/社交图标（用 Downloads/crawl-fa-icons.js 重新生成）
 *
 * 非图标的工具类（fa-fw、fa-2x…）会因为在 all.min.css 里没有 content 规则而自动过滤。
 * 新增图标后重跑：node scripts/subset-fontawesome.js
 */
const fs = require('fs')
const path = require('path')
const { fontawesomeSubset } = require('fontawesome-subset')

const ROOT = path.resolve(__dirname, '..')
const VENDOR_CSS = path.join(ROOT, 'public/vendor/fontawesome/css/all.min.css')
const OUT_DIR = path.join(ROOT, 'public/vendor/fontawesome-subset')
const LIVE_ICONS = path.join(__dirname, 'fontawesome-live-icons.json')
const SCAN_TARGETS = [
  'themes/heo',
  'components',
  'conf',
  'lib',
  'pages',
  'blog.config.js'
]
const SCAN_EXT = /\.(js|jsx|ts|tsx|css|json|md)$/

function scanRepoIcons() {
  const icons = new Set()
  const visit = p => {
    const stat = fs.statSync(p)
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(p)) {
        if (f === 'node_modules' || f.startsWith('.')) continue
        visit(path.join(p, f))
      }
      return
    }
    if (!SCAN_EXT.test(p)) return
    const text = fs.readFileSync(p, 'utf8')
    for (const m of text.matchAll(/\bfa-[a-z0-9-]+/g)) icons.add(m[0])
  }
  for (const t of SCAN_TARGETS) {
    const p = path.join(ROOT, t)
    if (fs.existsSync(p)) visit(p)
  }
  return icons
}

function main() {
  const css = fs.readFileSync(VENDOR_CSS, 'utf8')

  // 从 all.min.css 提取全部图标规则：选择器组 -> content 码点
  // 形如 .fa-xmark:before,.fa-times:before{content:"\f00d"}
  const iconRules = []
  const nameToRule = new Map()
  const ruleRe =
    /(\.fa-[a-z0-9-]+::?before(?:,\s*\.fa-[a-z0-9-]+::?before)*)\s*\{\s*content\s*:\s*"[^"]+"\s*\}/g
  for (const m of css.matchAll(ruleRe)) {
    const names = [...m[1].matchAll(/\.fa-([a-z0-9-]+)::?before/g)].map(
      x => x[1]
    )
    const rule = { text: m[0], names, keep: false }
    iconRules.push(rule)
    for (const n of names) nameToRule.set(n, rule)
  }

  // 并集：代码扫描 + 线上爬取
  const requested = scanRepoIcons()
  if (fs.existsSync(LIVE_ICONS)) {
    for (const c of JSON.parse(fs.readFileSync(LIVE_ICONS, 'utf8'))) {
      requested.add(c)
    }
  }

  // 只保留真实图标（在 css 图标规则表里的名字）；别名同组一起保留
  const keepNames = new Set()
  for (const cls of requested) {
    const name = cls.replace(/^fa-/, '')
    const rule = nameToRule.get(name)
    if (!rule) continue
    rule.keep = true
    for (const n of rule.names) keepNames.add(n)
  }

  console.log(
    `requested classes: ${requested.size}, matched icons(+aliases): ${keepNames.size}`
  )

  // 用 FA 官方 metadata 把图标归到各自存在的 free style（solid/regular/brands），
  // fontawesome-subset 是严格模式：请求了某 style 里不存在的图标会整体失败
  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'node_modules/@fortawesome/fontawesome-free/metadata/icon-families.json'
      ),
      'utf8'
    )
  )
  const freeStylesOf = info =>
    (info?.familyStylesByLicense?.free || []).map(x => x.style)
  const aliasToCanonical = new Map()
  for (const [name, info] of Object.entries(metadata)) {
    aliasToCanonical.set(name, name)
    for (const alias of info?.aliases?.names || []) {
      aliasToCanonical.set(alias, name)
    }
  }
  const byStyle = { solid: new Set(), regular: new Set(), brands: new Set() }
  const unknown = []
  for (const n of keepNames) {
    const canonical = aliasToCanonical.get(n)
    const styles = canonical ? freeStylesOf(metadata[canonical]) : []
    if (!canonical || styles.length === 0) {
      unknown.push(n)
      continue
    }
    for (const s of styles) {
      if (byStyle[s]) byStyle[s].add(canonical)
    }
  }
  if (unknown.length) {
    console.log('skip (no free style):', unknown.join(', '))
  }

  const subsetMap = {
    solid: [...byStyle.solid].sort(),
    regular: [...byStyle.regular].sort(),
    brands: [...byStyle.brands].sort()
  }
  console.log(
    `solid: ${subsetMap.solid.length}, regular: ${subsetMap.regular.length}, brands: ${subsetMap.brands.length}`
  )

  const webfontsDir = path.join(OUT_DIR, 'webfonts')
  fs.mkdirSync(webfontsDir, { recursive: true })
  return Promise.resolve(
    fontawesomeSubset(subsetMap, webfontsDir, {
      package: 'free',
      targetFormats: ['woff2']
    })
  ).then(ok => {
    if (!ok) throw new Error('fontawesome-subset failed')

    // 生成子集 CSS：丢弃未用图标的 content 规则，其余（font-face、工具类）原样保留
    let outCss = css
    for (const rule of iconRules) {
      if (!rule.keep) outCss = outCss.replace(rule.text, '')
    }
    // 子集只产 woff2：去掉 ttf 兜底引用与 v4 兼容 font-face
    outCss = outCss
      .replace(/,\s*url\([^)]*\.ttf\)\s*format\("truetype"\)/g, '')
      .replace(/@font-face\s*\{[^}]*v4compatibility[^}]*\}/g, '')

    const cssDir = path.join(OUT_DIR, 'css')
    fs.mkdirSync(cssDir, { recursive: true })
    const outPath = path.join(cssDir, 'all.min.css')
    fs.writeFileSync(outPath, outCss)

    const kb = f => (fs.statSync(f).size / 1024).toFixed(1) + 'KB'
    console.log('css:', kb(outPath), '(全量 ' + kb(VENDOR_CSS) + ')')
    for (const f of fs.readdirSync(webfontsDir)) {
      console.log('font:', f, kb(path.join(webfontsDir, f)))
    }
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
