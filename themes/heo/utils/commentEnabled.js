import { siteConfig } from '@/lib/config'

/**
 * 与 components/Comment.js 支持的评论服务保持一致。
 * 未配置评论服务时不显示跳转入口，避免跳到空白占位区。
 */
export function isHeoCommentServiceConfigured() {
  return Boolean(
    siteConfig('COMMENT_ARTALK_SERVER') ||
      siteConfig('COMMENT_TWIKOO_ENV_ID') ||
      siteConfig('COMMENT_WALINE_SERVER_URL') ||
      siteConfig('COMMENT_VALINE_APP_ID') ||
      siteConfig('COMMENT_GISCUS_REPO') ||
      siteConfig('COMMENT_CUSDIS_APP_ID') ||
      siteConfig('COMMENT_UTTERRANCES_REPO') ||
      siteConfig('COMMENT_GITALK_CLIENT_ID') ||
      siteConfig('COMMENT_WEBMENTION_ENABLE')
  )
}
