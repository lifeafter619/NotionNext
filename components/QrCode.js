import { loadExternalResource } from '@/lib/utils'
import { useEffect, useRef } from 'react'

/**
 * 二维码生成
 */
export default function QrCode({ value }) {
  const containerRef = useRef(null)
  const qrCodeCDN =
    process.env.NEXT_PUBLIC_QR_CODE_CDN ||
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'

  useEffect(() => {
    const container = containerRef.current
    if (!value || !container) {
      return
    }
    let cancelled = false
    loadExternalResource(qrCodeCDN, 'js')
      .then(() => {
        const QRCode = window?.QRCode
        // 组件可能在脚本加载期间被卸载或已切换文章
        if (cancelled || typeof QRCode === 'undefined') {
          return
        }
        // value 变化时重绘，清掉旧二维码，避免叠加多个 canvas
        container.innerHTML = ''
        new QRCode(container, {
          text: value,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        })
      })
      .catch(err => {
        console.warn('二维码脚本加载失败', err)
      })
    return () => {
      cancelled = true
      container.innerHTML = ''
    }
  }, [value, qrCodeCDN])

  return <div ref={containerRef}></div>
}
