import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * 常量时间字符串比较，用于 API Token 鉴权，防时序攻击。
 * 先对双方做 sha256 定长化，规避 timingSafeEqual 的长度不等抛错
 * （长度差异本身也是时序信号）。
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const digestA = createHash('sha256').update(a).digest()
  const digestB = createHash('sha256').update(b).digest()
  return timingSafeEqual(digestA, digestB)
}
