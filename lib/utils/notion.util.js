/**
 * Notion 数据格式清理工具
 * 旧版 block:{ value:{}}
 * 新版 block:{ spaceId:{ id:{ value:{} } } }
 * 强制解包成旧版
 * @param {*} blockMap
 * @returns
 */
export function adapterNotionBlockMap(blockMap) {
  if (!blockMap) return blockMap

  return {
    ...blockMap,
    block: unwrapRecordMap(blockMap.block),
    collection: unwrapRecordMap(blockMap.collection),
    collection_view: unwrapRecordMap(blockMap.collection_view),
    automation: unwrapRecordMap(blockMap.automation),
    automation_action: unwrapRecordMap(blockMap.automation_action)
  }
}

export function normalizeNotionBlockType(type) {
  switch (type) {
    case 'paragraph':
      return 'text'
    case 'bulleted_list_item':
      return 'bulleted_list'
    case 'numbered_list_item':
      return 'numbered_list'
    case 'heading_1':
      return 'header'
    case 'heading_2':
      return 'sub_header'
    case 'heading_3':
    case 'heading_4':
    case 'header_4':
      return 'sub_sub_header'
    default:
      return type
  }
}

function unwrapValue(obj) {
  if (!obj) return obj

  // 新格式特征：外层有 role 或 spaceId，value 里才是真实 block（有 id 和 type）
  // { spaceId, value: { value: { id, type, ... }, role } }
  if (obj?.value?.value?.id && obj?.value?.role) {
    return obj.value.value
  }

  // 次新格式：{ value: { id, type, ... }, role }
  if (obj?.value?.id && obj?.role !== undefined) {
    return obj.value
  }

  // 旧格式：{ value: { id, type, ... } } 直接取 value
  if (obj?.value?.id) {
    return obj.value
  }

  // 兜底：原样返回
  return obj?.value ?? obj
}

function unwrapRecordMap(recordMap = {}) {
  const cleaned = {}

  for (const [id, record] of Object.entries(recordMap || {})) {
    cleaned[id] = { value: unwrapValue(record) }
  }

  return cleaned
}
