import DefaultTheme from 'vitepress/theme'
import type { EnhanceAppContext } from 'vitepress'
import Layout from './Layout.vue'
import { cjkTokenize } from '../search-tokenize'
import './style.css'

/** 勿把 tokenize 放进 themeConfig（会序列化进 HTML 导致 JSON 解析失败、全站白屏） */
function patchSearchTokenize(siteData: EnhanceAppContext['siteData']) {
  const mini = siteData.themeConfig?.search?.options?.miniSearch
  if (mini?.options) {
    mini.options.tokenize = cjkTokenize
  }
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ siteData }: EnhanceAppContext) {
    patchSearchTokenize(siteData)
  }
}
