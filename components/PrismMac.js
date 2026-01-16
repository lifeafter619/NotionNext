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
import { useRouter } from 'next/navigation'
import { useGlobal } from '@/lib/global'
import { siteConfig } from '@/lib/config'

/**
 * 代码美化相关
 * @author https://github.com/txs/
 * @returns
 */
const PrismMac = () => {
  const router = useRouter()
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
    // 性能优化：如果没有代码块或Mermaid，则不加载资源
    const codeBlocks = document.querySelectorAll('pre, code, .code-toolbar')
    const mermaidBlocks = document.querySelectorAll('.language-mermaid')

    if (codeBlocks.length === 0 && mermaidBlocks.length === 0) {
      return
    }

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

    const runLogic = () => {
      if (window?.Prism?.plugins?.autoloader) {
        window.Prism.plugins.autoloader.languages_path = prismjsPath
      }

      renderPrismMac(codeLineNumbers)
      if (mermaidBlocks.length > 0) {
        renderMermaid(mermaidCDN)
      }
      renderCollapseCode(codeCollapse, codeCollapseExpandDefault)
    }

    // 延迟执行以避免阻塞主线程
    setTimeout(() => {
      loadExternalResource(prismjsAutoLoader, 'js').then(() => {
        runLogic()
      })
    }, 100)

  }, [router, isDarkMode])

  return <></>
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
  const codeBlocks = document.querySelectorAll('.code-toolbar')
  for (const codeBlock of codeBlocks) {
    // 判断当前元素是否被包裹
    if (codeBlock.closest('.collapse-wrapper')) {
      continue // 如果被包裹了，跳过当前循环
    }

    const code = codeBlock.querySelector('code')
    const language = code.getAttribute('class').match(/language-(\w+)/)[1]

    const collapseWrapper = document.createElement('div')
    collapseWrapper.className = 'collapse-wrapper w-full py-2'
    const panelWrapper = document.createElement('div')
    panelWrapper.className =
      'border dark:border-gray-600 rounded-md hover:border-indigo-500 duration-200 transition-colors'

    const header = document.createElement('div')
    header.className =
      'flex justify-between items-center px-4 py-2 cursor-pointer select-none'
    header.innerHTML = `<h3 class="text-lg font-medium">${language}</h3><svg class="transition-all duration-200 w-5 h-5 transform rotate-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6.293 6.293a1 1 0 0 1 1.414 0L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/></svg>`

    const panel = document.createElement('div')
    panel.className =
      'invisible h-0 transition-transform duration-200 border-t border-gray-300'

    panelWrapper.appendChild(header)
    panelWrapper.appendChild(panel)
    collapseWrapper.appendChild(panelWrapper)

    codeBlock.parentNode.insertBefore(collapseWrapper, codeBlock)
    panel.appendChild(codeBlock)

    function collapseCode() {
      panel.classList.toggle('invisible')
      panel.classList.toggle('h-0')
      panel.classList.toggle('h-auto')
      header.querySelector('svg').classList.toggle('rotate-180')
      panelWrapper.classList.toggle('border-gray-300')
    }

    // 点击后折叠展开代码
    header.addEventListener('click', collapseCode)
    // 是否自动展开
    if (codeCollapseExpandDefault) {
      header.click()
    }
  }
}

/**
 * 将mermaid语言 渲染成图片
 */
const renderMermaid = mermaidCDN => {
  // 优化：仅在有mermaid块时加载，避免不必要的观察
  const existingMermaid = document.querySelectorAll('.language-mermaid')
  if (existingMermaid.length === 0) return

  const processMermaid = () => {
    const mermaidsSvg = document.querySelectorAll('.mermaid')
    if (mermaidsSvg) {
        let needLoad = false
        for (const e of mermaidsSvg) {
        if (e?.firstChild?.nodeName !== 'svg') {
            needLoad = true
        }
        }
        // 如果已经渲染过，跳过
        if (!needLoad && mermaidsSvg.length > 0) return
    }

    // 查找未处理的 mermaid 块
    document.querySelectorAll('.language-mermaid').forEach(el => {
        const chart = el.querySelector('code').textContent
        if (chart && !el.querySelector('.mermaid')) {
          const mermaidChart = document.createElement('div')
          mermaidChart.className = 'mermaid'
          mermaidChart.innerHTML = chart
          el.appendChild(mermaidChart)
        }
    })

    // 加载脚本并渲染
    loadExternalResource(mermaidCDN, 'js').then(url => {
        setTimeout(() => {
        const mermaid = window.mermaid
        if (mermaid) {
            mermaid.contentLoaded()
            // 渲染完成后添加容器和控制
            setTimeout(() => {
            const svgs = document.querySelectorAll('.mermaid svg')
            svgs.forEach(svg => {
                if (!svg.closest('.mermaid-container')) {
                // 成功渲染后隐藏原始代码块
                const codeBlock = svg.closest('.notion-code')
                if (codeBlock) {
                    const code = codeBlock.querySelector('code')
                    if (code) code.style.display = 'none'
                }
                wrapMermaid(svg)
                }
            })
            }, 300)
        }
        }, 100)
    })
  }

  processMermaid()

  // 观察后续变化（例如动态加载），但进行去抖动或限制范围
  const observer = new MutationObserver(mutationsList => {
    let shouldProcess = false
    for (const m of mutationsList) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        if (m.target.classList?.contains('language-mermaid') ||
            (m.target.querySelector && m.target.querySelector('.language-mermaid'))) {
            shouldProcess = true
            break
        }
      }
    }
    if (shouldProcess) {
       processMermaid()
    }
  })

  const article = document.querySelector('#notion-article')
  if (article) {
    observer.observe(article, {
      childList: true, // 仅观察子节点变化，不深度观察 subtree 除非必要
      subtree: true    // 仍然需要 subtree 因为 mermaid 块可能嵌套深
    })
  }
}

/**
 * 包装 Mermaid SVG 以支持拖拽和缩放
 */
const wrapMermaid = (svg) => {
  const container = document.createElement('div')
  container.className = 'mermaid-container relative overflow-hidden bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 my-4'
  container.style.height = '400px' // 默认高度
  container.style.cursor = 'grab'

  const content = document.createElement('div')
  content.className = 'mermaid-content w-full h-full flex items-center justify-center'
  content.style.transformOrigin = 'center'
  content.style.transition = 'transform 0.1s ease-out'

  svg.parentNode.insertBefore(container, svg)
  content.appendChild(svg)
  container.appendChild(content)

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

  // 添加控制按钮
  const controls = document.createElement('div')
  controls.className = 'absolute bottom-2 right-2 flex gap-2 z-10'
  controls.innerHTML = `
    <button class="p-1 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Zoom In"><i class="fas fa-plus"></i></button>
    <button class="p-1 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Zoom Out"><i class="fas fa-minus"></i></button>
    <button class="p-1 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Reset"><i class="fas fa-compress"></i></button>
  `

  const [btnIn, btnOut, btnReset] = controls.querySelectorAll('button')

  btnIn.onclick = (e) => {
    e.stopPropagation()
    scale = Math.min(scale + 0.2, 5)
    updateTransform()
  }

  btnOut.onclick = (e) => {
    e.stopPropagation()
    scale = Math.max(scale - 0.2, 0.5)
    updateTransform()
  }

  btnReset.onclick = (e) => {
    e.stopPropagation()
    scale = 1
    contentX = 0
    contentY = 0
    updateTransform()
  }

  container.appendChild(controls)

  // 鼠标拖拽逻辑
  container.onmousedown = (e) => {
    if (e.target.closest('button')) return
    isDragging = true
    container.style.cursor = 'grabbing'
    startX = e.clientX - contentX
    startY = e.clientY - contentY
  }

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    e.preventDefault()
    contentX = e.clientX - startX
    contentY = e.clientY - startY
    updateTransform()
  })

  window.addEventListener('mouseup', () => {
    isDragging = false
    container.style.cursor = 'grab'
  })

  // 触摸拖拽逻辑
  container.ontouchstart = (e) => {
    if (e.target.closest('button')) return
    if (e.touches.length === 1) {
      isDragging = true
      startX = e.touches[0].clientX - contentX
      startY = e.touches[0].clientY - contentY
    }
  }

  container.ontouchmove = (e) => {
    if (!isDragging) return
    e.preventDefault() // 防止滚动
    if (e.touches.length === 1) {
      contentX = e.touches[0].clientX - startX
      contentY = e.touches[0].clientY - startY
      updateTransform()
    }
  }

  container.ontouchend = () => {
    isDragging = false
  }

  // 滚轮缩放
  container.onwheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        scale = Math.min(Math.max(scale + delta, 0.5), 5)
        updateTransform()
    }
  }
}

function renderPrismMac(codeLineNumbers) {
  const container = document?.getElementById('notion-article')

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
     Prism.highlightAll()
  } catch (err) {
    console.log('代码渲染', err)
  }

  const codeToolBars = container?.getElementsByClassName('code-toolbar')
  // Add pre-mac element for Mac Style UI
  if (codeToolBars) {
    Array.from(codeToolBars).forEach(item => {
      const existPreMac = item.getElementsByClassName('pre-mac')
      if (existPreMac.length < codeToolBars.length) {
        const preMac = document.createElement('div')
        preMac.classList.add('pre-mac')
        preMac.innerHTML = '<span></span><span></span><span></span>'
        item?.appendChild(preMac, item)
      }
    })
  }

  // 折叠代码行号bug
  if (codeLineNumbers) {
    fixCodeLineStyle()
  }
}

/**
 * 行号样式在首次渲染或被detail折叠后行高判断错误
 * 在此手动resize计算
 */
const fixCodeLineStyle = () => {
  const observer = new MutationObserver(mutationsList => {
    for (const m of mutationsList) {
      if (m.target.nodeName === 'DETAILS') {
        const preCodes = m.target.querySelectorAll('pre.notion-code')
        for (const preCode of preCodes) {
          Prism.plugins.lineNumbers.resize(preCode)
        }
      }
    }
  })
  observer.observe(document.querySelector('#notion-article'), {
    attributes: true,
    subtree: true
  })
  setTimeout(() => {
    const preCodes = document.querySelectorAll('pre.notion-code')
    for (const preCode of preCodes) {
      Prism.plugins.lineNumbers.resize(preCode)
    }
  }, 10)
}

export default PrismMac
