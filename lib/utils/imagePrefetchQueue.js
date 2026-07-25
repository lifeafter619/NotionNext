import { siteConfig } from '@/lib/config'

/**
 * 空闲图片预取队列
 *
 * 目标：首屏内容加载完成后，把页面上尚未进入视口的懒加载图片
 * （首页下方的封面、文章内的配图等）以受限并发提前拉进 HTTP 缓存，
 * 用户滚动到时可立即显示，无需等待网络。
 *
 * 设计约束：
 * - 只在 window load 之后、浏览器空闲时启动，绝不与首屏资源抢带宽；
 * - 并发上限（默认 4）避免占满连接池、避免低端设备解码压力过大；
 * - 预取请求带 fetchPriority=low，即使与用户滚动触发的加载重叠，
 *   浏览器也会优先真实可见的图片；
 * - 尊重用户省流设置（Save-Data）与弱网（2g）自动禁用；
 * - 组件卸载（路由切换）时取消尚未开始的预取，不浪费流量。
 */

const DEFAULT_CONCURRENCY = 4
const MAX_CONCURRENCY_LIMIT = 8

const queue = []
const knownUrls = new Set()
let inFlight = 0
let started = false
let startScheduled = false

const isBrowser = typeof window !== 'undefined'

function readConfigNumber(key, fallback) {
  try {
    const value = Number(siteConfig(key, fallback))
    if (Number.isFinite(value) && value > 0) {
      return value
    }
  } catch (_) {}
  return fallback
}

function readConfigBoolean(key, fallback) {
  try {
    const value = siteConfig(key, fallback)
    if (value === false || value === 'false') return false
    if (value === true || value === 'true') return true
  } catch (_) {}
  return fallback
}

function getMaxConcurrency() {
  return Math.min(
    readConfigNumber('IMAGE_PREFETCH_CONCURRENCY', DEFAULT_CONCURRENCY),
    MAX_CONCURRENCY_LIMIT
  )
}

/**
 * 弱网或用户开启省流模式时不做预取
 */
function shouldSkipPrefetch() {
  if (!isBrowser) return true
  if (!readConfigBoolean('IMAGE_PREFETCH_ENABLE', true)) return true

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection
  if (connection) {
    if (connection.saveData) return true
    const effectiveType = String(connection.effectiveType || '')
    if (effectiveType.includes('2g')) return true
  }
  return false
}

function scheduleIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout: 4000 })
  } else {
    setTimeout(() => callback(), 1500)
  }
}

function ensureStartScheduled() {
  if (started || startScheduled || !isBrowser) return
  startScheduled = true

  // 测试环境不自动启动，由测试通过 __imagePrefetchQueueTestHooks 手动驱动
  if (process.env.NODE_ENV === 'test') return

  const begin = () => scheduleIdle(startDraining)
  if (document.readyState === 'complete') {
    begin()
  } else {
    window.addEventListener('load', begin, { once: true })
  }
}

function startDraining() {
  started = true
  drain()
}

function drain() {
  const maxConcurrency = getMaxConcurrency()
  while (inFlight < maxConcurrency && queue.length > 0) {
    const item = queue.shift()
    if (!item || item.cancelled) continue
    warm(item)
  }
}

function warm(item) {
  inFlight += 1
  const image = new Image()
  const finish = () => {
    image.onload = null
    image.onerror = null
    inFlight -= 1
    drain()
  }
  image.onload = finish
  image.onerror = finish
  try {
    // 低优先级：绝不与用户可见图片竞争
    image.fetchPriority = 'low'
  } catch (_) {}
  image.decoding = 'async'
  image.referrerPolicy = item.referrerPolicy || 'no-referrer'
  // 与 LazyImage 真实加载时的 srcset/sizes 保持一致，
  // 保证浏览器预热的正是稍后会选中的那个候选 URL
  if (item.sizes) image.sizes = item.sizes
  if (item.srcSet) image.srcset = item.srcSet
  image.src = item.src
}

/**
 * 把一张图片加入空闲预取队列
 * @param {object} entry { src, srcSet, sizes, referrerPolicy }
 * @returns {function} 取消函数：在图片组件卸载（路由切换）时调用，
 *                     未开始的预取会被跳过
 */
export function enqueueImagePrefetch(entry) {
  if (!isBrowser || !entry?.src) return () => {}
  if (String(entry.src).startsWith('data:')) return () => {}
  if (shouldSkipPrefetch()) return () => {}
  if (knownUrls.has(entry.src)) return () => {}

  knownUrls.add(entry.src)
  const item = {
    src: entry.src,
    srcSet: entry.srcSet,
    sizes: entry.sizes,
    referrerPolicy: entry.referrerPolicy,
    cancelled: false
  }
  queue.push(item)
  ensureStartScheduled()
  if (started) {
    drain()
  }

  return () => {
    item.cancelled = true
    // 允许之后（例如返回该页面时）重新入队
    knownUrls.delete(item.src)
  }
}

/** 仅供测试使用 */
export const __imagePrefetchQueueTestHooks = {
  start: startDraining,
  reset() {
    queue.length = 0
    knownUrls.clear()
    inFlight = 0
    started = false
    startScheduled = false
  },
  state() {
    return {
      pending: queue.filter(item => !item.cancelled).length,
      inFlight,
      started
    }
  }
}
