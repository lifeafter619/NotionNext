import { mapImgUrl } from '@/lib/db/notion/mapImage'
import { restoreCompactBlockMapForRender } from '@/lib/db/notion/cleanBlockMapForClient'

export function resolveNotionImageDimensions(width, height, metaDims) {
  const provided = { width: Number(width), height: Number(height) }
  if (provided.width > 0 && provided.height > 0) return provided

  const metadata = {
    width: Number(metaDims?.width),
    height: Number(metaDims?.height)
  }
  if (metadata.width > 0 && metadata.height > 0) return metadata

  return {
    width: provided.width > 0 ? provided.width : undefined,
    height: provided.height > 0 ? provided.height : undefined
  }
}

export function collectContentImageMeta(blockMap, rootId) {
  const meta = { first: null, dims: {} }
  const restoredBlockMap = restoreCompactBlockMapForRender(blockMap)
  const blocks = restoredBlockMap?.block
  if (!blocks) return meta

  const rootBlockId =
    (rootId && blocks[rootId]?.value ? rootId : null) ||
    Object.keys(blocks).find(id => getNotionValue(blocks[id])?.type === 'page')
  if (!rootBlockId) return meta

  const visited = new Set()
  const walk = blockId => {
    if (!blockId || visited.has(blockId)) return
    visited.add(blockId)
    const value = getNotionValue(blocks[blockId])
    if (!value) return

    if (value.type === 'page' && blockId !== rootBlockId) return

    if (value.type === 'image') {
      const source =
        restoredBlockMap.signed_urls?.[blockId] ||
        value.properties?.source?.[0]?.[0]
      const src = source ? mapImgUrl(source, value) : null
      if (src) {
        const blockWidth = Number(value.format?.block_width)
        const aspectRatio = Number(value.format?.block_aspect_ratio)
        const blockHeight =
          blockWidth > 0 && aspectRatio > 0
            ? Math.round(blockWidth * aspectRatio)
            : Number(value.format?.block_height)
        if (blockWidth > 0 && blockHeight > 0 && !meta.dims[src]) {
          meta.dims[src] = { width: blockWidth, height: blockHeight }
        }
        if (!meta.first) meta.first = src
      }
      return
    }

    const syncedRefId = value.format?.transclusion_reference_pointer?.id
    if (syncedRefId) walk(syncedRefId)
    if (Array.isArray(value.content)) value.content.forEach(walk)
  }

  walk(rootBlockId)
  return meta
}

function getNotionValue(record) {
  if (!record) return undefined
  if (record.value) return getNotionValue(record.value)
  return record.id ? record : undefined
}
