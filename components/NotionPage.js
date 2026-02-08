import { siteConfig } from '@/lib/config'
import { compressImage, mapImgUrl } from '@/lib/db/notion/mapImage'
import { isBrowser, loadExternalResource, getImageSrc } from '@/lib/utils'
import { useImageViewerContext } from '@/lib/ImageViewerContext'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import { useEffect, useCallback, useMemo } from 'react'
import { NotionRenderer } from 'react-notion-x'

// 阅读进度保存组件
const ReadingPositionSaver = dynamic(
  () => import('@/components/ReadingPositionSaver'),
  { ssr: false }
)

/**
 * 整个站点的核心组件
 * 将Notion数据渲染成网页
 * @param {*} param0
 * @returns
 */
const NotionPage = ({ post, className }) => {
  // 是否关闭数据库和画册的点击跳转
  const POST_DISABLE_GALLERY_CLICK = siteConfig('POST_DISABLE_GALLERY_CLICK')
  const POST_DISABLE_DATABASE_CLICK = siteConfig('POST_DISABLE_DATABASE_CLICK')
  const SPOILER_TEXT_TAG = siteConfig('SPOILER_TEXT_TAG')
  const IMAGE_ZOOM_IN_WIDTH = siteConfig('IMAGE_ZOOM_IN_WIDTH', 1200)
  const READING_PROGRESS_SAVE = siteConfig('READING_PROGRESS_SAVE', true)

  // 使用全局图片查看器
  const { openViewer } = useImageViewerContext()

  // 检查是否包含代码块，优化PrismMac加载
  const hasCode = useMemo(() => {
      // 兼容 post 为 recordMap 或 post 为包含 blockMap 的对象
      const blockMap = post?.blockMap?.block || post?.block
      if (!blockMap) return false
      return Object.values(blockMap).some(block => block.value?.type === 'code')
  }, [post])

  // 处理图片点击事件
  const handleImageClick = useCallback(
    e => {
      const target = e.target
      if (target.tagName === 'IMG' && target.closest('.notion-asset-wrapper')) {
        e.preventDefault()
        e.stopPropagation()

        // 收集所有文章内图片 (排除侧栏和其他非文章主体内容)
        // 使用更精确的选择器，或者过滤掉包含 wow fadeInUp 类（如果是侧栏元素特征）的元素
        // 但 wow fadeInUp 通常是动画类，文章内图片也可能有。
        // 根据用户反馈 "wow fadeInUp 这个里面，也就是侧栏中出现的图片"
        // 我们可以检查元素的祖先是否包含侧栏特定的类名，例如 #side-bar (如果存在)
        // 或者只选择 #notion-article .notion-page-content img (如果结构如此)
        // 目前 #notion-article 包含 NotionRenderer，通常包含文章主体。
        // 如果侧栏图片混入，可能是因为 selector 选到了不该选的。
        // 我们这里加一个简单的过滤：排除 sidebar 内的图片。
        // 假设侧栏 id 是 sideRight 或 side-bar。

        let allImages = Array.from(document.querySelectorAll('#notion-article .notion-asset-wrapper img'))

        // 过滤掉位于侧栏中的图片 (如果侧栏不幸被包含在 #notion-article 中，或者有重叠)
        // 通常 #notion-article 是纯文章内容。如果用户说 "wow fadeInUp 里面... 侧栏中出现的图片"
        // 可能侧栏的部分组件被错误地渲染到了 article 区域，或者选择器范围太大。
        // 无论如何，我们可以过滤掉那些 offsetParent 为 null (不可见) 或者在特定容器内的图片。

        allImages = allImages.filter(img => {
            const sideRight = document.getElementById('sideRight')
            const sideBar = document.getElementById('sideBar') // 假设 ID
            // 如果图片在侧栏内，则排除
            if (sideRight && sideRight.contains(img)) return false
            if (sideBar && sideBar.contains(img)) return false
            return true
        })

        const imageList = allImages.map(img => {
            const src = getImageSrc(img)
            let highResSrc = src
            try {
               const urlObj = new URL(src)
               // Remove resize parameters to get high quality image
               urlObj.searchParams.delete('width')
               urlObj.searchParams.delete('height')
               urlObj.searchParams.delete('quality')
               urlObj.searchParams.delete('fmt')
               urlObj.searchParams.delete('fm') // Unsplash
               urlObj.searchParams.delete('crop')
               urlObj.searchParams.delete('fit')

               // Special handling for Unsplash to ensure high res
               if (src.includes('unsplash.com')) {
                  urlObj.searchParams.set('q', '100') // Set max quality
               }

               highResSrc = urlObj.toString()
            } catch (e) {
               // ignore
            }
            return {
                src,
                alt: img.getAttribute('alt') || '',
                highResSrc
            }
        })

        const currentSrc = getImageSrc(target)
        // 修正：确保找到正确的索引
        // 有时候 src 可能经过了处理，这里尝试更宽松的匹配，或者回退到 0
        let currentIndex = imageList.findIndex(item => item.src === currentSrc)
        if (currentIndex === -1) {
            // 尝试通过 highResSrc 匹配 (假设 target 也是原始链接)
            currentIndex = imageList.findIndex(item => item.highResSrc === currentSrc)
        }
        if (currentIndex === -1) {
            currentIndex = 0 // Fallback
        }

        // 传递图片列表和当前索引
        openViewer(imageList, currentIndex)
      }
    },
    [openViewer]
  )

  // 页面首次打开时执行的勾子
  useEffect(() => {
    // 检测当前的url并自动滚动到对应目标
    autoScrollToHash()
  }, [])

  // 页面文章发生变化时会执行的勾子
  useEffect(() => {
    // 相册视图点击禁止跳转，只能放大查看图片
    if (POST_DISABLE_GALLERY_CLICK) {
      // 针对页面中的gallery视图，点击后是放大图片
      processGalleryImg(openViewer, IMAGE_ZOOM_IN_WIDTH)
    }

    // 页内数据库点击禁止跳转，只能查看
    if (POST_DISABLE_DATABASE_CLICK) {
      processDisableDatabaseUrl()
    }
  }, [post, POST_DISABLE_GALLERY_CLICK, POST_DISABLE_DATABASE_CLICK, openViewer, IMAGE_ZOOM_IN_WIDTH])

  useEffect(() => {
    // Spoiler文本功能
    if (SPOILER_TEXT_TAG) {
      import('lodash/escapeRegExp').then(escapeRegExp => {
        Promise.all([
          loadExternalResource('/js/spoilerText.js', 'js'),
          loadExternalResource('/css/spoiler-text.css', 'css')
        ]).then(() => {
          window.textToSpoiler &&
            window.textToSpoiler(escapeRegExp.default(SPOILER_TEXT_TAG))
        })
      })
    }

    // 查找所有具有 'notion-collection-page-properties' 类的元素,删除notion自带的页面properties
    const timer = setTimeout(() => {
      // 查找所有具有 'notion-collection-page-properties' 类的元素
      const elements = document.querySelectorAll(
        '.notion-collection-page-properties'
      )

      // 遍历这些元素并将其从 DOM 中移除
      elements?.forEach(element => {
        element?.remove()
      })
    }, 1000) // 1000 毫秒 = 1 秒

    // 清理定时器，防止组件卸载时执行
    return () => clearTimeout(timer)
  }, [post])

  // const cleanBlockMap = cleanBlocksWithWarn(post?.blockMap);
  // console.log('NotionPage render with post:', post);

  return (
    <>
      <div
        id='notion-article'
        className={`mx-auto overflow-hidden ${className || ''}`}
        onClick={handleImageClick}>
        <NotionRenderer
          recordMap={post?.blockMap}
          mapPageUrl={mapPageUrl}
          mapImageUrl={mapImgUrl}
          components={{
            Code,
            Collection,
            Equation,
            Modal,
            Pdf,
            Tweet
          }}
        />

      <AdEmbed />
      <PrismMac />
    </div>
  )
}

function cleanBlocksWithWarn(blockMap) {
  const cleanedBlocks = {};
  const removedBlockIds = [];

  for (const [id, block] of Object.entries(blockMap.block || {})) {
    if (!block?.value?.id) {
      removedBlockIds.push(id);
      continue;
    }

    const newBlock = { ...block };

    if (Array.isArray(newBlock.value.content)) {
      // 递归清理 content 中无效的 blockId
      newBlock.value.content = newBlock.value.content.filter((cid) => {
        if (!blockMap.block[cid]?.value?.id) {
          removedBlockIds.push(cid);
          return false;
        }
        return true;
      });
    }

    cleanedBlocks[id] = newBlock;
  }

  if (removedBlockIds.length) {
    console.warn('Removed invalid blocks:', removedBlockIds);
  }

  return {
    ...blockMap,
    block: cleanedBlocks,
  };
}



/**
 * 页面的数据库链接禁止跳转，只能查看
 */
const processDisableDatabaseUrl = () => {
  if (isBrowser) {
    const links = document.querySelectorAll('.notion-table a')
    for (const e of links) {
      e.removeAttribute('href')
    }
  }
}

/**
 * gallery视图，点击后是放大图片
 */
const processGalleryImg = (openViewer, imageZoomWidth) => {
  setTimeout(() => {
    if (isBrowser) {
      const imgList = document?.querySelectorAll(
        '.notion-collection-card-cover img'
      )
      if (imgList) {
        for (let i = 0; i < imgList.length; i++) {
          const img = imgList[i]
          img.style.cursor = 'zoom-in'
          img.addEventListener('click', e => {
            e.preventDefault()
            e.stopPropagation()
            const src = getImageSrc(img)
            const highResSrc = compressImage(src, imageZoomWidth)
            const alt = img.getAttribute('alt') || ''
            openViewer(highResSrc, alt)
          })
        }
      }

      const cards = document.getElementsByClassName('notion-collection-card')
      for (const e of cards) {
        e.removeAttribute('href')
      }
    }
  }, 800)
}

/**
 * 根据url参数自动滚动到锚位置
 */
const autoScrollToHash = () => {
  setTimeout(() => {
    // 跳转到指定标题
    const hash = window?.location?.hash
    const needToJumpToTitle = hash && hash.length > 0
    if (needToJumpToTitle) {
      console.log('jump to hash', hash)
      const tocNode = document.getElementById(hash.substring(1))
      if (tocNode && tocNode?.className?.indexOf('notion') > -1) {
        tocNode.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
  }, 180)
}

/**
 * 将id映射成博文内部链接。
 * @param {*} id
 * @returns
 */
const mapPageUrl = id => {
  // return 'https://www.notion.so/' + id.replace(/-/g, '')
  return '/' + id.replace(/-/g, '')
}

// 代码
const Code = dynamic(
  () =>
    import('react-notion-x/build/third-party/code').then(m => {
      return m.Code
    }),
  { ssr: false }
)

// 公式
const Equation = dynamic(
  () =>
    import('@/components/Equation').then(async m => {
      // 化学方程式
      await import('@/lib/plugins/mhchem')
      return m.Equation
    }),
  { ssr: false }
)

// 原版文档
// const Pdf = dynamic(
//   () => import('react-notion-x/build/third-party/pdf').then(m => m.Pdf),
//   {
//     ssr: false
//   }
// )
const Pdf = dynamic(() => import('@/components/Pdf').then(m => m.Pdf), {
  ssr: false
})

// 美化代码 from: https://github.com/txs
const PrismMac = dynamic(() => import('@/components/PrismMac'), {
  ssr: false
})

/**
 * tweet嵌入
 */
const TweetEmbed = dynamic(() => import('react-tweet-embed'), {
  ssr: false
})

/**
 * 文内google广告
 */
const AdEmbed = dynamic(
  () => import('@/components/GoogleAdsense').then(m => m.AdEmbed),
  { ssr: true }
)

const Collection = dynamic(
  () =>
    import('react-notion-x/build/third-party/collection').then(
      m => m.Collection
    ),
  {
    ssr: true
  }
)

const Modal = dynamic(
  () => import('react-notion-x/build/third-party/modal').then(m => m.Modal),
  { ssr: false }
)

const Tweet = ({ id }) => {
  return <TweetEmbed tweetId={id} />
}

export default NotionPage
