import { getTextContent } from 'notion-utils'

const indentLevels = {
  header: 0,
  sub_header: 1,
  sub_sub_header: 2
}

/**
 * @see https://github.com/NotionX/react-notion-x/blob/master/packages/notion-utils/src/get-page-table-of-contents.ts
 * Gets the metadata for a table of contents block by parsing the page's
 * H1, H2, and H3 elements.
 */
export const getPageTableOfContents = (page, recordMap) => {
  const contents = page.content ?? []
  const toc = getBlockHeader(contents, recordMap)
  const indentLevelStack = [
    {
      actual: -1,
      effective: -1
    }
  ]

  // Adjust indent levels to always change smoothly.
  // This is a little tricky, but the key is that when increasing indent levels,
  // they should never jump more than one at a time.
  for (const tocItem of toc) {
    const { indentLevel } = tocItem
    const actual = indentLevel

    do {
      const prevIndent = indentLevelStack[indentLevelStack.length - 1]
      const { actual: prevActual, effective: prevEffective } = prevIndent

      if (actual > prevActual) {
        tocItem.indentLevel = prevEffective + 1
        indentLevelStack.push({
          actual,
          effective: tocItem.indentLevel
        })
      } else if (actual === prevActual) {
        tocItem.indentLevel = prevEffective
        break
      } else {
        indentLevelStack.pop()
      }

      // eslint-disable-next-line no-constant-condition
    } while (true)
  }

  return toc
}

/**
 * 重写获取目录方法
 */
function getBlockHeader(contents, recordMap, toc) {
  if (!toc) {
    toc = []
  }
  if (!contents) {
    return toc
  }

  for (const blockId of contents) {
    const block = recordMap.block[blockId]?.value
    if (!block) {
      continue
    }
    const { type } = block

    // 1. 先检查该Block本身是否是标题
    if (type.indexOf('header') >= 0) {
      const existed = toc.find(e => e.id === blockId)
      if (!existed) {
        toc.push({
          id: blockId,
          type,
          text: getTextContent(block.properties?.title),
          indentLevel: indentLevels[type]
        })
      }
    }

    // 2. 递归处理子Block (Notion中缩进的Block是子Block)
    if (block.content?.length > 0) {
      getBlockHeader(block.content, recordMap, toc)
    }
    // 3. 处理引用Block (Synced Block)
    else if (type === 'transclusion_reference') {
      // 引用Block本身没有内容，而是指向另一个Block (transclusion_reference_pointer)
      if (block.format?.transclusion_reference_pointer?.id) {
         getBlockHeader(
          [block.format.transclusion_reference_pointer.id],
          recordMap,
          toc
        )
      }
    }
    // 4. 处理引用容器 (Source of Synced Block)
    else if (type === 'transclusion_container') {
        // 通常容器会有 content，如果有 content 会走上面的第2步
        // 这里是为了防止某些特殊情况下 content 为空或未正确解析
        if (block.content) {
             getBlockHeader(block.content, recordMap, toc)
        }
    }
  }

  return toc
}
