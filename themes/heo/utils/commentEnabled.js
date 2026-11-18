import { hasEnabledComments } from '@/lib/utils/comments'
import { siteConfig } from '@/lib/config'

/**
 * 与 components/Comment.js 支持的评论服务保持一致。
 * 统一走共享的 hasEnabledComments：正确处理字符串 'false' / 'true'。
 * 未配置评论服务时不显示跳转入口，避免跳到空白占位区。
 */
export function isHeoCommentServiceConfigured() {
  return hasEnabledComments(siteConfig)
}
