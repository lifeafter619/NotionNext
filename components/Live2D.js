/* eslint-disable no-undef */
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isMobile, loadExternalResource } from '@/lib/utils'
import { useEffect } from 'react'

/**
 * 网页动画
 * @returns
 */
export default function Live2D() {
  const { theme, switchTheme } = useGlobal()
  const showPet = JSON.parse(siteConfig('WIDGET_PET'))
  const petLink = siteConfig('WIDGET_PET_LINK')
  const petSwitchTheme = siteConfig('WIDGET_PET_SWITCH_THEME')

  useEffect(() => {
    if (showPet && !isMobile()) {
      // 延时加载以避免阻塞首屏
      const timer = setTimeout(() => {
        Promise.all([
          loadExternalResource(
            'https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/live2d.min.js',
            'js'
          )
        ]).then(e => {
          if (typeof window?.loadlive2d !== 'undefined') {
            // https://github.com/xiazeyu/live2d-widget-models
            try {
              // 确保canvas元素存在后再加载
              const canvas = document.getElementById('live2d')
              if (canvas) {
                loadlive2d('live2d', petLink)
              }
            } catch (error) {
              console.error('读取PET模型', error)
            }
          }
        })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [theme])

  function handleClick() {
    if (petSwitchTheme) {
      switchTheme()
    }
  }

  if (!showPet) {
    return <></>
  }

  return (
    <canvas
      id='live2d'
      width='280'
      height='250'
      onClick={handleClick}
      className='cursor-grab'
      onMouseDown={e => e.target.classList.add('cursor-grabbing')}
      onMouseUp={e => e.target.classList.remove('cursor-grabbing')}
    />
  )
}
