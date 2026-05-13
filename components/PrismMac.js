import { useEffect } from 'react'
import Prism from 'prismjs'
// 所有语言的prismjs 使用autoloader引入
// import 'prismjs/plugins/autoloader/prism-autoloader'
import 'prismjs/plugins/toolbar/prism-toolbar'
import 'prismjs/plugins/toolbar/prism-toolbar.min.css'
import 'prismjs/plugins/show-language/prism-show-language'
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard'
import 'prismjs/plugins/line-numbers/prism-line-numbers'
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'

// mermaid图
import { loadExternalResource } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useGlobal } from '@/lib/global'
import { siteConfig } from '@/lib/config'

/**
 * 代码美化相关
 * @author https://github.com/txs/
 * @returns
 */
const PrismMac = () => {
  const pathname = usePathname()
  const { isDarkMode } = useGlobal()
  const codeMacBar = siteConfig('CODE_MAC_BAR')
  const prismjsAutoLoader = siteConfig('PRISM_JS_AUTO_LOADER')
  const prismjsPath = siteConfig('PRISM_JS_PATH')

  const prismThemeSwitch = siteConfig('PRISM_THEME_SWITCH')
  const prismThemeDarkPath = siteConfig('PRISM_THEME_DARK_PATH')
  const prismThemeLightPath = siteConfig('PRISM_THEME_LIGHT_PATH')
  const prismThemePrefixPath = siteConfig('PRISM_THEME_PREFIX_PATH')

  const mermaidCDN = siteConfig('MERMAID_CDN') || 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js'
  const codeLineNumbers = siteConfig('CODE_LINE_NUMBERS')

  const codeCollapse = siteConfig('CODE_COLLAPSE')
  const codeCollapseExpandDefault = siteConfig('CODE_COLLAPSE_EXPAND_DEFAULT')

  useEffect(() => {
    let isDisposed = false
    let stopLineNumbers = () => {}

    const article = getNotionArticle()
    if (!article) return
    const hasCodeBlocks = Boolean(article.querySelector('pre.notion-code'))
    if (!hasCodeBlocks) return

    if (codeMacBar) {
      loadExternalResource('/css/prism-mac-style.css', 'css')
    }
    // 加载prism样式
    loadPrismThemeCSS(
      isDarkMode,
      prismThemeSwitch,
      prismThemeDarkPath,
      prismThemeLightPath,
      prismThemePrefixPath
    )
    // 折叠代码
    loadExternalResource(prismjsAutoLoader, 'js')
      .then(() => {
        if (isDisposed) return
        try {
          if (typeof window !== 'undefined' && !window.Prism) {
            window.Prism = Prism
          }
          if (window?.Prism?.plugins?.autoloader) {
            window.Prism.plugins.autoloader.languages_path = prismjsPath
          }

          const dispose = renderPrismMac(codeLineNumbers)
          stopLineNumbers = typeof dispose === 'function' ? dispose : () => {}
          renderMermaid(mermaidCDN)
          renderCollapseCode(codeCollapse, codeCollapseExpandDefault)
        } catch (err) {
          console.warn('[PrismMac] render failed:', err)
        }
      })
      .catch(err => {
        console.warn('[PrismMac] prism autoloader load failed:', err)
      })

    return () => {
      isDisposed = true
      try {
        stopLineNumbers()
      } catch (e) {
        /* ignore */
      }
    }
  }, [pathname, isDarkMode])

  return <></>
}

const getNotionArticle = () => {
  const inArticleWrapper = document.querySelector('#article-wrapper #notion-article')
  if (inArticleWrapper) return inArticleWrapper

  const candidates = Array.from(document.querySelectorAll('#notion-article'))
  if (candidates.length <= 1) return candidates[0] || null

  // 多主题并存时可能有多个 notion-article，优先选择正文内容更完整的节点
  const score = el => {
    const codeCount = el.querySelectorAll('pre.notion-code, .code-toolbar').length
    const blockCount = el.querySelectorAll('.notion, .notion-page, .notion-text').length
    return codeCount * 10 + blockCount
  }

  return candidates.sort((a, b) => score(b) - score(a))[0] || null
}

const getNotionArticles = () => {
  const inArticleWrapper = Array.from(
    document.querySelectorAll('#article-wrapper #notion-article')
  )
  if (inArticleWrapper.length > 0) return inArticleWrapper

  return Array.from(document.querySelectorAll('#notion-article'))
}

/**
 * 加载Prism主题样式
 */
const loadPrismThemeCSS = (
  isDarkMode,
  prismThemeSwitch,
  prismThemeDarkPath,
  prismThemeLightPath,
  prismThemePrefixPath
) => {
  let PRISM_THEME
  let PRISM_PREVIOUS
  if (prismThemeSwitch) {
    if (isDarkMode) {
      PRISM_THEME = prismThemeDarkPath
      PRISM_PREVIOUS = prismThemeLightPath
    } else {
      PRISM_THEME = prismThemeLightPath
      PRISM_PREVIOUS = prismThemeDarkPath
    }
    const previousTheme = document.querySelector(
      `link[href="${PRISM_PREVIOUS}"]`
    )
    if (
      previousTheme &&
      previousTheme.parentNode &&
      previousTheme.parentNode.contains(previousTheme)
    ) {
      previousTheme.parentNode.removeChild(previousTheme)
    }
    loadExternalResource(PRISM_THEME, 'css')
  } else {
    loadExternalResource(prismThemePrefixPath, 'css')
  }
}

/*
 * 将代码块转为可折叠对象
 */
const renderCollapseCode = (codeCollapse, codeCollapseExpandDefault) => {
  if (!codeCollapse) {
    return
  }

  const COLLAPSE_MIN_LINES = Number(siteConfig('CODE_COLLAPSE_MIN_LINES', 20))
  const codeBlocks = document.querySelectorAll('.code-toolbar')

  for (const codeBlock of codeBlocks) {
    try {
      if (codeBlock.closest('.collapse-wrapper')) {
        continue
      }

      const code = codeBlock.querySelector('code')
      if (!code) {
        continue
      }

      const className = code.getAttribute('class') || ''
      const languageMatch = className.match(/language-([\w-]+)/)
      const language = languageMatch ? languageMatch[1] : ''

      const text = code.textContent || ''
      const lineCount = text ? text.split('\n').length : 0

      // 方案 C：仅当代码行数超过阈值时才启用折叠
      if (lineCount && lineCount < COLLAPSE_MIN_LINES) {
        continue
      }

      const parent = codeBlock.parentNode
      if (!parent || !parent.contains(codeBlock)) {
        continue
      }

      const collapseWrapper = document.createElement('div')
      collapseWrapper.className = 'collapse-wrapper w-full py-2'

      const panelWrapper = document.createElement('div')
      panelWrapper.className = 'collapse-panel-wrapper'

      const header = document.createElement('button')
      header.type = 'button'
      header.className = 'collapse-header'

      const label = language
        ? `${language.toUpperCase()} · ${lineCount} lines`
        : `${lineCount} lines`

      header.innerHTML = `<span class="collapse-label">${label}</span><svg class="collapse-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6.293 6.293a1 1 0 0 1 1.414 0L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/></svg>`

      const panel = document.createElement('div')
      panel.className = 'collapse-panel'

      panelWrapper.appendChild(header)
      panelWrapper.appendChild(panel)
      collapseWrapper.appendChild(panelWrapper)

      parent.insertBefore(collapseWrapper, codeBlock)
      panel.appendChild(codeBlock)

      function setExpanded(expanded) {
        panelWrapper.classList.toggle('is-expanded', expanded)
        panel.classList.toggle('is-expanded', expanded)
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false')
        panel.style.maxHeight = expanded ? `${panel.scrollHeight}px` : '0px'
      }

      header.addEventListener('click', () => {
        const expanded = panelWrapper.classList.contains('is-expanded')
        setExpanded(!expanded)
      })

      setExpanded(Boolean(codeCollapseExpandDefault))
    } catch (err) {
      console.warn('[PrismMac] collapse code failed:', err)
    }
  }
}

/**
 * 将mermaid语言 渲染成图片
 */
const renderMermaid = mermaidCDN => {
  const articles = getNotionArticles()
  if (!articles || articles.length === 0) return

  let hasMermaidBlocks = false

  for (const article of articles) {
    const mermaidCodeBlocks = article.querySelectorAll(
      '.notion-code.language-mermaid'
    )
    for (const codeBlock of mermaidCodeBlocks) {
      const chart = codeBlock.querySelector('code')?.textContent
      if (!chart) continue
      hasMermaidBlocks = true
      let mermaidChart = codeBlock.querySelector('.mermaid')
      if (!mermaidChart) {
        mermaidChart = document.createElement('pre')
        mermaidChart.className = 'mermaid'
        mermaidChart.textContent = chart
        codeBlock.appendChild(mermaidChart)
      }
    }
  }

  if (!hasMermaidBlocks) return

  loadExternalResource(mermaidCDN, 'js')
    .then(() => {
      setTimeout(() => {
        try {
          const mermaid = window.mermaid
          if (!mermaid) return
          mermaid?.contentLoaded()
        } catch (err) {
          console.warn('[PrismMac] mermaid render failed:', err)
        }
      }, 60)
    })
    .catch(err => {
      console.warn('[PrismMac] mermaid load failed:', err)
    })
}

/**
 * 包装 Mermaid SVG 以支持拖拽、缩放和链接点击（类似 GitHub）
 */
const wrapMermaid = (svg) => {
  const container = document.createElement('div')
  container.className = 'mermaid-container relative overflow-hidden bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 my-4 shadow-sm'
  container.style.height = '400px' // 默认高度
  container.style.cursor = 'grab'
  container.style.minHeight = '200px'

  const content = document.createElement('div')
  content.className = 'mermaid-content w-full h-full flex items-center justify-center'
  content.style.transformOrigin = 'center'
  content.style.transition = 'transform 0.1s ease-out'

  // 将容器插入到 svg 的父元素中 (即 .mermaid div)
  // svg 已经在 .mermaid 中，所以 insertBefore 是在 .mermaid 中操作
  svg.parentNode.insertBefore(container, svg)
  content.appendChild(svg)
  container.appendChild(content)

  // 移动容器到代码块下方
  const codeEl = container.closest('.language-mermaid')
  if (codeEl && codeEl.parentNode) {
      // 确保代码块显示
      const pre = codeEl.closest('pre')
      if (pre) pre.style.display = 'block'
      // 将图表容器移动到代码块后面
      codeEl.parentNode.insertBefore(container, codeEl.nextSibling)
  }

  // 初始化状态
  let scale = 1
  let contentX = 0
  let contentY = 0
  let isDragging = false
  let startX = 0
  let startY = 0

  const updateTransform = () => {
    content.style.transform = `translate(${contentX}px, ${contentY}px) scale(${scale})`
  }

  // 缩放比例显示
  const zoomIndicator = document.createElement('div')
  zoomIndicator.className = 'mermaid-zoom-indicator absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded text-xs text-gray-600 dark:text-gray-400 font-mono shadow border border-gray-200 dark:border-gray-700'
  zoomIndicator.textContent = '100%'
  container.appendChild(zoomIndicator)

  const updateZoomIndicator = () => {
    zoomIndicator.textContent = `${Math.round(scale * 100)}%`
  }

  // 启用 mermaid 图中的链接点击功能（类似 GitHub）
  enableMermaidLinks(svg, container)

  // 添加控制按钮面板（不含全屏按钮）
  const controls = document.createElement('div')
  controls.className = 'mermaid-controls absolute bottom-3 right-3 flex gap-1.5 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border border-gray-200 dark:border-gray-700'
  controls.innerHTML = `
    <button class="mermaid-btn p-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="放大 (Zoom In)"><i class="fas fa-search-plus"></i></button>
    <button class="mermaid-btn p-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="缩小 (Zoom Out)"><i class="fas fa-search-minus"></i></button>
    <button class="mermaid-btn p-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="重置 (Reset)"><i class="fas fa-compress-arrows-alt"></i></button>
  `

  const btns = controls.querySelectorAll('.mermaid-btn')
  const [btnIn, btnOut, btnReset] = [btns[0], btns[1], btns[2]]

  btnIn.onclick = (e) => {
    e.stopPropagation()
    scale = Math.min(scale + 0.25, 5)
    updateTransform()
    updateZoomIndicator()
  }

  btnOut.onclick = (e) => {
    e.stopPropagation()
    scale = Math.max(scale - 0.25, 0.3)
    updateTransform()
    updateZoomIndicator()
  }

  btnReset.onclick = (e) => {
    e.stopPropagation()
    scale = 1
    contentX = 0
    contentY = 0
    updateTransform()
    updateZoomIndicator()
  }

  container.appendChild(controls)

  // 鼠标拖拽逻辑
  container.onmousedown = (e) => {
    if (e.target.closest('button') || e.target.closest('.mermaid-controls') || e.target.closest('a')) return
    isDragging = true
    container.style.cursor = 'grabbing'
    startX = e.clientX - contentX
    startY = e.clientY - contentY
  }

  const mouseMoveHandler = (e) => {
    if (!isDragging) return
    e.preventDefault()
    contentX = e.clientX - startX
    contentY = e.clientY - startY
    updateTransform()
  }

  const mouseUpHandler = () => {
    isDragging = false
    container.style.cursor = 'grab'
  }

  window.addEventListener('mousemove', mouseMoveHandler)
  window.addEventListener('mouseup', mouseUpHandler)

  // 触摸拖拽逻辑
  let lastTouchDistance = 0 // 用于双指缩放

  container.ontouchstart = (e) => {
    if (e.target.closest('button') || e.target.closest('.mermaid-controls') || e.target.closest('a')) return
    if (e.touches.length === 1) {
      isDragging = true
      startX = e.touches[0].clientX - contentX
      startY = e.touches[0].clientY - contentY
    } else if (e.touches.length === 2) {
      // 双指缩放开始
      lastTouchDistance = getTouchDistance(e.touches)
    }
  }

  container.ontouchmove = (e) => {
    if (e.target.closest('button') || e.target.closest('.mermaid-controls') || e.target.closest('a')) return
    e.preventDefault() // 防止滚动
    
    if (e.touches.length === 1 && isDragging) {
      contentX = e.touches[0].clientX - startX
      contentY = e.touches[0].clientY - startY
      updateTransform()
    } else if (e.touches.length === 2) {
      // 双指缩放
      const newDistance = getTouchDistance(e.touches)
      if (lastTouchDistance > 0) {
        const delta = (newDistance - lastTouchDistance) / 200
        scale = Math.min(Math.max(scale + delta, 0.3), 5)
        updateTransform()
        updateZoomIndicator()
      }
      lastTouchDistance = newDistance
    }
  }

  container.ontouchend = (e) => {
    isDragging = false
    if (e.touches.length < 2) {
      lastTouchDistance = 0
    }
  }

  // 滚轮缩放（不需要 Ctrl 键也可以缩放）
  container.onwheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    scale = Math.min(Math.max(scale + delta, 0.3), 5)
    updateTransform()
    updateZoomIndicator()
  }

  // 双击重置
  container.ondblclick = (e) => {
    if (e.target.closest('button') || e.target.closest('.mermaid-controls') || e.target.closest('a')) return
    scale = 1
    contentX = 0
    contentY = 0
    updateTransform()
    updateZoomIndicator()
  }
}

/**
 * 获取两个触摸点之间的距离（用于双指缩放）
 */
const getTouchDistance = (touches) => {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 启用 Mermaid 图中的链接点击功能（类似 GitHub）
 * 处理 mermaid 图表中的 click 事件和超链接
 */
const enableMermaidLinks = (svg, container) => {
  // 处理 mermaid 中定义的 click 回调链接
  // Mermaid 使用 <a> 标签或 onclick 属性来处理链接
  const links = svg.querySelectorAll('a, [onclick], .clickable')
  
  links.forEach(link => {
    // 确保链接可点击，不被拖拽干扰
    link.style.cursor = 'pointer'
    link.style.pointerEvents = 'auto'
    
    // 如果是 <a> 标签，确保在新窗口打开外部链接
    if (link.tagName.toLowerCase() === 'a') {
      const href = link.getAttribute('xlink:href') || link.getAttribute('href')
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noopener noreferrer')
      }
      // 添加视觉提示
      link.addEventListener('mouseenter', () => {
        container.style.cursor = 'pointer'
      })
      link.addEventListener('mouseleave', () => {
        container.style.cursor = 'grab'
      })
    }
  })

  // 为所有可交互节点添加悬停效果
  const nodes = svg.querySelectorAll('.node, .cluster, .edgeLabel')
  nodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      node.style.opacity = '0.8'
    })
    node.addEventListener('mouseleave', () => {
      node.style.opacity = '1'
    })
  })
}

function renderPrismMac(codeLineNumbers) {
  const container = getNotionArticle()

  // Add line numbers
  if (codeLineNumbers) {
    const codeBlocks = container?.getElementsByTagName('pre')
    if (codeBlocks) {
      Array.from(codeBlocks).forEach(item => {
        if (!item.classList.contains('line-numbers')) {
          item.classList.add('line-numbers')
          item.style.whiteSpace = 'pre-wrap'
        }
      })
    }
  }

  // 仅在必要时高亮，尽量避免 highlightAll
  // 如果 react-notion-x 已经处理了，这里可能只需要处理 line-numbers
  // 但是 Prism.highlightAll 会强制重新高亮。
  // 我们只对未处理的块调用 highlightElement ?
  // 简单起见，仍然使用 highlightAll 但在 setTimeout 中，且有条件
  try {
    if (container && typeof Prism.highlightAllUnder === 'function') {
      Prism.highlightAllUnder(container)
    } else {
      Prism.highlightAll()
    }
  } catch (err) {
    console.warn('[PrismMac] prism highlight failed:', err)
  }

  const codeToolBars = container?.getElementsByClassName('code-toolbar')
  // Add pre-mac element for Mac Style UI
  if (codeToolBars) {
    Array.from(codeToolBars).forEach(item => {
      try {
        const existPreMac = item.getElementsByClassName('pre-mac')
        if (existPreMac.length < 1) {
          const preMac = document.createElement('div')
          preMac.classList.add('pre-mac')
          preMac.innerHTML = '<span></span><span></span><span></span>'
          item.appendChild(preMac)
        }
      } catch (err) {
        console.warn('[PrismMac] pre-mac failed:', err)
      }
    })
  }

  // 折叠代码行号bug
  if (codeLineNumbers) {
    return fixCodeLineStyle()
  }
  return () => {}
}

/**
 * 行号样式在首次渲染或被detail折叠后行高判断错误
 * 在此手动resize计算
 */
const fixCodeLineStyle = () => {
  const article = getNotionArticle()
  if (!article) {
    return () => {}
  }

  if (!Prism?.plugins?.lineNumbers?.resize) {
    return () => {}
  }

  const observer = new MutationObserver(mutationsList => {
    for (const m of mutationsList) {
      if (m.target.nodeName === 'DETAILS') {
        const preCodes = m.target.querySelectorAll('pre.notion-code')
        for (const preCode of preCodes) {
          try {
            Prism.plugins.lineNumbers.resize(preCode)
          } catch (e) {
            /* ignore */
          }
        }
      }
    }
  })
  observer.observe(article, {
    attributes: true,
    subtree: true
  })
  const timeoutId = setTimeout(() => {
    const preCodes = article.querySelectorAll('pre.notion-code')
    for (const preCode of preCodes) {
      try {
        Prism.plugins.lineNumbers.resize(preCode)
      } catch (e) {
        /* ignore */
      }
    }
  }, 10)

  return () => {
    clearTimeout(timeoutId)
    observer.disconnect()
  }
}

export default PrismMac
