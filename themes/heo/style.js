import { themeConsoleStyle } from '@/lib/themeConsoleStyle'
import { siteConfig } from '@/lib/config'
import CONFIG from './config'

/**
 * 此处样式只对当前主题生效
 * 此处不支持tailwindCSS的 @apply 语法
 * @returns
 */
const Style = () => {
  return (
    <style jsx global>{`
      #theme-heo {
        --heo-color-primary: #4f65f0;
        --heo-color-primary-hover: ${siteConfig(
          'HEO_COLOR_PRIMARY_HOVER',
          '#4f46e5',
          CONFIG
        )};
        --heo-color-primary-text: ${siteConfig(
          'HEO_COLOR_PRIMARY_TEXT',
          '#ffffff',
          CONFIG
        )};
        --heo-color-accent: ${siteConfig(
          'HEO_COLOR_ACCENT',
          '#ca8a04',
          CONFIG
        )};
        --heo-color-bg: #f7f9fe;
        --heo-color-bg-dark: #18171d;
        --heo-color-card: #ffffff;
        --heo-color-card-dark: #1e1e1e;
        --heo-color-card-muted: ${siteConfig(
          'HEO_COLOR_CARD_MUTED',
          '#f1f3f8',
          CONFIG
        )};
        --heo-color-border: #4f46e5;
        --heo-color-border-dark: #ca8a04;
        --heo-color-text-light: ${siteConfig('HEO_COLOR_TEXT', '#000000', CONFIG)};
        --heo-color-text-secondary-light: ${siteConfig('HEO_COLOR_TEXT_SECONDARY', '#4b5563', CONFIG)};
        --heo-color-text-dark: #f3f4f6;
        --heo-color-text-secondary-dark: #d1d5db;
        --heo-color-text: var(--heo-color-text-light);
        --heo-color-text-secondary: var(--heo-color-text-secondary-light);
        background-color: var(--heo-color-bg);
        color: var(--heo-color-text);
      }

      .dark #theme-heo {
        --heo-color-primary: var(--heo-color-primary-dark);
        --heo-color-text: var(--heo-color-text-dark);
        --heo-color-text-secondary: var(--heo-color-text-secondary-dark);
        background-color: var(--heo-color-bg-dark);
      }

      html:not(.dark) #theme-heo .bg-white {
        background-color: var(--heo-color-card);
      }

      .dark #theme-heo .dark\:bg-\[\#18171d\] {
        background-color: var(--heo-color-bg-dark);
      }

      .dark #theme-heo .dark\:bg-\[\#1e1e1e\] {
        background-color: var(--heo-color-card-dark);
      }

      #theme-heo .bg-\[\#4f65f0\] {
        background-color: var(--heo-color-primary);
      }

      #theme-heo .bg-\[\#f1f3f8\] {
        background-color: var(--heo-color-card-muted);
      }

      #theme-heo .bg-indigo-600,
      #theme-heo .hover\:bg-indigo-600:hover {
        background-color: var(--heo-color-primary-hover);
      }

      .dark #theme-heo .dark\:bg-yellow-600,
      .dark #theme-heo .dark\:hover\:bg-yellow-600:hover {
        background-color: var(--heo-color-accent);
      }

      #theme-heo .text-white {
        color: var(--heo-color-primary-text);
      }

      html:not(.dark) #theme-heo .text-black {
        color: var(--heo-color-text);
      }

      html:not(.dark) #theme-heo .text-gray-600 {
        color: var(--heo-color-text-secondary);
      }

      #theme-heo .hover\:text-indigo-600:hover,
      #theme-heo .group:hover .group-hover\:text-indigo-600 {
        color: var(--heo-color-primary-hover);
      }

      #theme-heo .hover\:border-indigo-600:hover {
        border-color: var(--heo-color-border);
      }

      .dark #theme-heo .dark\:hover\:border-yellow-600:hover {
        border-color: var(--heo-color-border-dark);
      }

      .dark #theme-heo #notion-article .notion-external-block,
      #theme-heo.dark #notion-article .notion-external-block {
        background: var(--heo-color-card-dark) !important;
        border-color: var(--heo-color-border-dark) !important;
      }

      .dark #theme-heo #notion-article .notion-external-title,
      #theme-heo.dark #notion-article .notion-external-title {
        color: var(--heo-color-text-dark) !important;
      }

      .dark #theme-heo #notion-article .notion-external-subtitle,
      .dark #theme-heo #notion-article .notion-external-block-desc,
      #theme-heo.dark #notion-article .notion-external-subtitle,
      #theme-heo.dark #notion-article .notion-external-block-desc {
        color: var(--heo-color-text-secondary-dark) !important;
      }

      body {
        background-color: ${siteConfig('HEO_COLOR_BG', '#f7f9fe', CONFIG)};
      }

      .dark body {
        background-color: ${siteConfig('HEO_COLOR_BG_DARK', '#18171d', CONFIG)};
      }

      /* 公告栏中的字体固定白色 */
      #theme-heo #announcement-content .notion {
        color: white;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(60, 60, 67, 0.4);
        border-radius: 8px;
        cursor: pointer;
      }

      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      #more {
        white-space: nowrap;
      }

      #theme-heo #notion-article {
        overflow: visible;
      }

      #theme-heo #notion-article .notion-text,
      #theme-heo #notion-article .notion-h,
      #theme-heo #notion-article .notion-list,
      #theme-heo #notion-article .notion-quote,
      #theme-heo #notion-article .notion-callout,
      #theme-heo #notion-article .notion-toggle,
      #theme-heo #notion-article .notion-table-of-contents,
      #theme-heo #notion-article .notion-bookmark,
      #theme-heo #notion-article .notion-page-link {
        width: 100%;
        max-width: 100%;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      #theme-heo #notion-article .notion-asset-wrapper,
      #theme-heo #notion-article .notion-code,
      #theme-heo #notion-article .notion-table,
      #theme-heo #notion-article .notion-board,
      #theme-heo #notion-article .notion-gallery,
      #theme-heo #notion-article .notion-simple-table {
        max-width: 100%;
      }

      .today-card-cover {
      }

      .recent-top-post-group::-webkit-scrollbar {
        display: none;
      }

      .scroll-hidden::-webkit-scrollbar {
        display: none;
      }

      * {
        box-sizing: border-box;
      }

      /* 标签滚动动画 */
      .tags-group-wrapper {
        animation: rowup 60s linear infinite;
        will-change: transform;
      }

      @keyframes rowup {
        0% {
          transform: translateX(0%);
        }
        100% {
          transform: translateX(-50%);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .tags-group-wrapper {
          animation: none;
          transform: none;
        }
      }

      ${themeConsoleStyle('heo', CONFIG)}

      #theme-heo {
        --heo-color-text: var(--heo-color-text-light);
        --heo-color-text-secondary: var(--heo-color-text-secondary-light);
      }

      .dark #theme-heo {
        --heo-color-text: var(--heo-color-text-dark);
        --heo-color-text-secondary: var(--heo-color-text-secondary-dark);
      }
    `}</style>
  )
}

export { Style }
