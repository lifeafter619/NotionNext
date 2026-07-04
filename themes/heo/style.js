/**
 * 此处样式只对当前主题生效
 * 此处不支持tailwindCSS的 @apply 语法
 * @returns
 */
const Style = () => {
  return (
    <style jsx global>{`
      body {
        background-color: #f7f9fe;
      }

      // 公告栏中的字体固定白色
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

      // 标签滚动动画
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
    `}</style>
  )
}

export { Style }
