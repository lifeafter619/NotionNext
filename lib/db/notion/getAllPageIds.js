import BLOG from '@/blog.config'
import { idToUuid } from 'notion-utils'

export default function getAllPageIds(
  collectionQuery,
  collectionId,
  collectionView,
  viewIds,
  block = {}
) {
  const pageSet = new Set()
  const targetViewId = viewIds?.[BLOG.NOTION_INDEX || 0]

  // Strategy 1: page_sort keeps Notion's manual order, but may be truncated.
  const selectedCollectionView = getRecordById(collectionView, targetViewId)
  const pageSort = selectedCollectionView?.value?.value?.page_sort
  if (Array.isArray(pageSort) && pageSort.length > 0) {
    pageSort.forEach(id => pageSet.add(id))
  }

  // Strategy 2: supplement truncated page_sort from the selected view query only.
  // If no selected view exists in the payload, preserve the legacy all-view fallback.
  const viewQuery = getRecordById(collectionQuery, collectionId)
  if (viewQuery) {
    const selectedViewData = getRecordById(viewQuery, targetViewId)
    const queryData = selectedViewData
      ? [selectedViewData]
      : Object.values(viewQuery)
    queryData.forEach(viewData => {
      ;[
        viewData?.collection_group_results?.blockIds,
        viewData?.results?.blockIds,
        viewData?.blockIds
      ].forEach(ids => {
        if (Array.isArray(ids)) ids.forEach(id => pageSet.add(id))
      })
    })
  }

  // Filter inaccessible blocks.
  // const accessibleIds = [...pageSet].filter(id => {
  //   const entry = block[id]
  //   if (!entry) return true
  //   return entry?.value?.role !== 'none' && entry?.value?.value?.role !== 'none'
  // })

  // console.log(`[getAllPageIds] final count: ${accessibleIds.length}`)
  return [...pageSet]
}

function getRecordById(record, id) {
  if (!record || !id) return null

  for (const candidate of getIdCandidates(id)) {
    const value = record[candidate]
    if (value) return value
  }

  return null
}

function getIdCandidates(id) {
  const candidates = new Set([id])

  if (typeof id === 'string') {
    candidates.add(id.replace(/-/g, ''))
    candidates.add(toUuid(id))
    try {
      candidates.add(idToUuid(id))
    } catch (_) {
      // Keep the original id candidates when notion-utils cannot normalize it.
    }
  }

  return [...candidates]
}

function toUuid(id) {
  const compactId = id.replace(/-/g, '')
  if (!/^[0-9a-fA-F]{32}$/.test(compactId)) return id

  return [
    compactId.slice(0, 8),
    compactId.slice(8, 12),
    compactId.slice(12, 16),
    compactId.slice(16, 20),
    compactId.slice(20)
  ].join('-')
}
