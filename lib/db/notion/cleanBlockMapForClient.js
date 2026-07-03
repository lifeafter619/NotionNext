export function cleanBlockMapForClient(blockMap) {
  if (!blockMap?.block) return blockMap

  const cleanedBlocks = {}
  const referencedAutomationIds = new Set()

  for (const [id, block] of Object.entries(blockMap.block)) {
    const cleanedBlock = { ...block }
    delete cleanedBlock.role

    if (cleanedBlock.value && typeof cleanedBlock.value === 'object') {
      cleanedBlock.value = cleanBlockValue(cleanedBlock.value)
      const automationId = cleanedBlock.value.format?.automation_id
      if (automationId) {
        referencedAutomationIds.add(automationId)
      }
    }

    cleanedBlocks[id] = cleanedBlock
  }

  const cleanedBlockMap = {
    ...blockMap,
    block: cleanedBlocks
  }

  cleanUnusedAutomationRecords(cleanedBlockMap, referencedAutomationIds)
  normalizeRecordMap(cleanedBlockMap.collection)
  normalizeRecordMap(cleanedBlockMap.collection_view)
  normalizeRecordMap(cleanedBlockMap.notion_user)
  normalizeRecordMap(cleanedBlockMap.automation)
  normalizeRecordMap(cleanedBlockMap.automation_action)
  cleanDerivableSignedUrls(cleanedBlockMap)

  return cleanedBlockMap
}

const COMPACT_BLOCK_IDS_KEY = '__compact_block_ids'
const COMPACT_BLOCK_VALUE_KEYS_KEY = '__compact_block_value_keys'
const COMPACT_BLOCK_TYPES_KEY = '__compact_block_types'
const COMPACT_PROPERTY_KEYS_KEY = '__compact_property_keys'
const DEFAULT_COMPACT_BLOCK_VALUE_KEYS = [
  'type',
  'parent_id',
  'properties',
  'content',
  'format',
  'file_ids'
]

export function compactBlockMapForClient(blockMap) {
  if (!blockMap?.block || blockMap[COMPACT_BLOCK_IDS_KEY]) return blockMap

  const blockIds = Object.keys(blockMap.block)
  if (blockIds.length === 0) return blockMap

  const idToCompactRef = new Map(
    blockIds.map((blockId, index) => [blockId, index])
  )
  const compactBlockValues = blockIds.map(blockId => {
    const block = blockMap.block[blockId]
    return block?.value && typeof block.value === 'object'
      ? compactBlockValue(block.value, idToCompactRef)
      : null
  })
  const compactBlockValueKeys = collectCompactBlockValueKeys(compactBlockValues)
  const compactBlockTypes = collectCompactDictionary(
    compactBlockValues.map(value => value?.type)
  )
  const compactPropertyKeys = collectCompactDictionary(
    compactBlockValues.flatMap(value =>
      value?.properties && typeof value.properties === 'object'
        ? Object.keys(value.properties)
        : []
    )
  )
  const typeToCompactRef = new Map(
    compactBlockTypes.map((type, index) => [type, index])
  )
  const propertyToCompactRef = new Map(
    compactPropertyKeys.map((property, index) => [property, index])
  )
  const compactBlocks = []

  blockIds.forEach((blockId, index) => {
    const block = blockMap.block[blockId]
    const compactBlock = { ...block }

    if (compactBlockValues[index]) {
      compactBlock.value = packCompactBlockValue(
        compactBlockValues[index],
        compactBlockValueKeys,
        typeToCompactRef,
        propertyToCompactRef
      )
    }

    const { value, ...rest } = compactBlock
    compactBlocks[index] =
      Object.keys(rest).length === 0 ? value : { ...rest, value }
  })

  return {
    ...blockMap,
    [COMPACT_BLOCK_IDS_KEY]: blockIds,
    [COMPACT_BLOCK_VALUE_KEYS_KEY]: compactBlockValueKeys,
    [COMPACT_BLOCK_TYPES_KEY]: compactBlockTypes,
    [COMPACT_PROPERTY_KEYS_KEY]: compactPropertyKeys,
    block: compactBlocks
  }
}

export function restoreCompactBlockMapForRender(blockMap) {
  const compactBlockIds = blockMap?.[COMPACT_BLOCK_IDS_KEY]
  if (!Array.isArray(compactBlockIds) || !blockMap?.block) return blockMap

  const compactBlockValueKeys = Array.isArray(
    blockMap[COMPACT_BLOCK_VALUE_KEYS_KEY]
  )
    ? blockMap[COMPACT_BLOCK_VALUE_KEYS_KEY]
    : DEFAULT_COMPACT_BLOCK_VALUE_KEYS
  const compactBlockTypes = Array.isArray(blockMap[COMPACT_BLOCK_TYPES_KEY])
    ? blockMap[COMPACT_BLOCK_TYPES_KEY]
    : []
  const compactPropertyKeys = Array.isArray(blockMap[COMPACT_PROPERTY_KEYS_KEY])
    ? blockMap[COMPACT_PROPERTY_KEYS_KEY]
    : []
  const restoredBlocks = {}
  compactBlockIds.forEach((blockId, index) => {
    const block = blockMap.block[index] || blockMap.block[String(index)]
    if (!block) return

    restoredBlocks[blockId] = restoreCompactBlockEntry(
      block,
      blockId,
      compactBlockIds,
      compactBlockValueKeys,
      compactBlockTypes,
      compactPropertyKeys
    )
  })

  const {
    [COMPACT_BLOCK_IDS_KEY]: _compactBlockIds,
    [COMPACT_BLOCK_VALUE_KEYS_KEY]: _compactBlockValueKeys,
    [COMPACT_BLOCK_TYPES_KEY]: _compactBlockTypes,
    [COMPACT_PROPERTY_KEYS_KEY]: _compactPropertyKeys,
    ...rest
  } = blockMap
  return {
    ...rest,
    block: restoredBlocks
  }
}

function collectCompactBlockValueKeys(values) {
  const keys = [...DEFAULT_COMPACT_BLOCK_VALUE_KEYS]
  const seen = new Set(keys)

  values.forEach(value => {
    if (!value || typeof value !== 'object') return
    Object.keys(value).forEach(key => {
      if (!seen.has(key)) {
        keys.push(key)
        seen.add(key)
      }
    })
  })

  return keys
}

function collectCompactDictionary(values) {
  const counts = new Map()
  const firstSeen = new Map()

  values.forEach(value => {
    if (typeof value !== 'string') return
    if (!firstSeen.has(value)) {
      firstSeen.set(value, firstSeen.size)
    }
    counts.set(value, (counts.get(value) || 0) + 1)
  })

  return Array.from(counts.keys()).sort((a, b) => {
    const countDiff = counts.get(b) - counts.get(a)
    if (countDiff !== 0) return countDiff
    return firstSeen.get(a) - firstSeen.get(b)
  })
}

function packCompactBlockValue(
  value,
  compactBlockValueKeys,
  typeToCompactRef,
  propertyToCompactRef
) {
  const packedValue = { ...value }

  if (typeof packedValue.type === 'string' && typeToCompactRef.has(value.type)) {
    packedValue.type = typeToCompactRef.get(value.type)
  }

  if (packedValue.properties && typeof packedValue.properties === 'object') {
    packedValue.properties = packCompactProperties(
      packedValue.properties,
      propertyToCompactRef
    )
  }

  const packed = compactBlockValueKeys.map(key =>
    packedValue[key] === undefined ? null : packedValue[key]
  )
  trimTrailingNulls(packed)
  return packed
}

function packCompactProperties(properties, propertyToCompactRef) {
  const packed = []
  Object.entries(properties).forEach(([key, value]) => {
    if (propertyToCompactRef.has(key)) {
      packed[propertyToCompactRef.get(key)] = value
    }
  })

  trimTrailingUndefineds(packed)
  return packed.map(value => (value === undefined ? null : value))
}

function trimTrailingNulls(values) {
  while (values.length > 0 && values[values.length - 1] === null) {
    values.pop()
  }
}

function trimTrailingUndefineds(values) {
  while (values.length > 0 && values[values.length - 1] === undefined) {
    values.pop()
  }
}

function restoreCompactBlockEntry(
  block,
  blockId,
  compactBlockIds,
  compactBlockValueKeys,
  compactBlockTypes,
  compactPropertyKeys
) {
  if (Array.isArray(block)) {
    return {
      value: restoreCompactBlockValue(
        block,
        blockId,
        compactBlockIds,
        compactBlockValueKeys,
        compactBlockTypes,
        compactPropertyKeys
      )
    }
  }

  const restoredBlock = { ...block }
  if (restoredBlock.value && typeof restoredBlock.value === 'object') {
    restoredBlock.value = restoreCompactBlockValue(
      restoredBlock.value,
      blockId,
      compactBlockIds,
      compactBlockValueKeys,
      compactBlockTypes,
      compactPropertyKeys
    )
  }
  return restoredBlock
}

function compactBlockValue(value, idToCompactRef) {
  const compactValue = { ...value }
  delete compactValue.id

  if (typeof compactValue.parent_id === 'string') {
    compactValue.parent_id = compactBlockReference(
      compactValue.parent_id,
      idToCompactRef
    )
  }

  if (Array.isArray(compactValue.content)) {
    compactValue.content = compactValue.content.map(blockId =>
      compactBlockReference(blockId, idToCompactRef)
    )
  }

  const transclusionReferenceId =
    compactValue.format?.transclusion_reference_pointer?.id
  if (typeof transclusionReferenceId === 'string') {
    compactValue.format = {
      ...compactValue.format,
      transclusion_reference_pointer: {
        ...compactValue.format.transclusion_reference_pointer,
        id: compactBlockReference(transclusionReferenceId, idToCompactRef)
      }
    }
  }

  return compactValue
}

function compactBlockReference(blockId, idToCompactRef) {
  return idToCompactRef.has(blockId) ? idToCompactRef.get(blockId) : blockId
}

function restoreCompactBlockValue(
  value,
  blockId,
  compactBlockIds,
  compactBlockValueKeys,
  compactBlockTypes,
  compactPropertyKeys
) {
  const unpackedValue = Array.isArray(value)
    ? unpackCompactBlockValue(
        value,
        compactBlockValueKeys,
        compactBlockTypes,
        compactPropertyKeys
      )
    : value
  const restoredValue = {
    ...unpackedValue,
    id: blockId
  }

  if (restoredValue.parent_id !== undefined) {
    restoredValue.parent_id = restoreCompactBlockReference(
      restoredValue.parent_id,
      compactBlockIds
    )
  }

  if (Array.isArray(restoredValue.content)) {
    restoredValue.content = restoredValue.content.map(ref =>
      restoreCompactBlockReference(ref, compactBlockIds)
    )
  }

  const transclusionReferenceId =
    restoredValue.format?.transclusion_reference_pointer?.id
  if (transclusionReferenceId !== undefined) {
    restoredValue.format = {
      ...restoredValue.format,
      transclusion_reference_pointer: {
        ...restoredValue.format.transclusion_reference_pointer,
        id: restoreCompactBlockReference(
          transclusionReferenceId,
          compactBlockIds
        )
      }
    }
  }

  return restoredValue
}

function unpackCompactBlockValue(
  packedValue,
  compactBlockValueKeys,
  compactBlockTypes,
  compactPropertyKeys
) {
  const value = {}
  compactBlockValueKeys.forEach((key, index) => {
    const item = packedValue[index]
    if (item === undefined || item === null) return
    value[key] = item
  })

  if (Number.isInteger(value.type) && compactBlockTypes[value.type]) {
    value.type = compactBlockTypes[value.type]
  }

  if (Array.isArray(value.properties)) {
    value.properties = unpackCompactProperties(
      value.properties,
      compactPropertyKeys
    )
  }

  return value
}

function unpackCompactProperties(packedProperties, compactPropertyKeys) {
  if (!compactPropertyKeys.length) return packedProperties

  const properties = {}
  packedProperties.forEach((value, index) => {
    if (value === undefined || value === null) return
    const key = compactPropertyKeys[index]
    if (key) properties[key] = value
  })
  return properties
}

function restoreCompactBlockReference(ref, compactBlockIds) {
  if (Number.isInteger(ref) && compactBlockIds[ref]) {
    return compactBlockIds[ref]
  }
  return ref
}

function cleanDerivableSignedUrls(blockMap) {
  if (!blockMap.signed_urls || typeof blockMap.signed_urls !== 'object') return

  const signedUrls = {}
  Object.entries(blockMap.signed_urls).forEach(([id, url]) => {
    const blockValue = blockMap.block?.[id]?.value
    if (!canDeriveAssetUrlFromBlock(blockValue)) {
      signedUrls[id] = url
    }
  })

  if (Object.keys(signedUrls).length > 0) {
    blockMap.signed_urls = signedUrls
  } else {
    delete blockMap.signed_urls
  }
}

function canDeriveAssetUrlFromBlock(blockValue) {
  if (!blockValue || typeof blockValue !== 'object') return false

  if (blockValue.type === 'page') {
    return Boolean(blockValue.format?.page_cover)
  }

  if (blockValue.type !== 'image') return false

  const source = blockValue.properties?.source?.[0]?.[0]
  if (!source) return false

  return !String(source).toLowerCase().split('?')[0].endsWith('.gif')
}

function cleanUnusedAutomationRecords(blockMap, referencedAutomationIds) {
  if (referencedAutomationIds.size === 0) {
    delete blockMap.automation
    delete blockMap.automation_action
    return
  }

  const actionIds = new Set()
  const automation = {}

  Object.entries(blockMap.automation || {}).forEach(([id, record]) => {
    if (!referencedAutomationIds.has(id)) return

    automation[id] = record
    const actionIdsFromRecord = getAutomationValue(record)?.action_ids
    if (Array.isArray(actionIdsFromRecord)) {
      actionIdsFromRecord.forEach(actionId => actionIds.add(actionId))
    }
  })

  if (Object.keys(automation).length > 0) {
    blockMap.automation = automation
  } else {
    delete blockMap.automation
  }

  const automationAction = {}
  Object.entries(blockMap.automation_action || {}).forEach(([id, record]) => {
    if (actionIds.has(id)) {
      automationAction[id] = record
    }
  })

  if (Object.keys(automationAction).length > 0) {
    blockMap.automation_action = automationAction
  } else {
    delete blockMap.automation_action
  }
}

function getAutomationValue(record) {
  if (!record || typeof record !== 'object') return null
  if (record.value?.value) return record.value.value
  return record.value || null
}

function normalizeRecordMap(recordMap) {
  if (!recordMap || typeof recordMap !== 'object') return

  Object.entries(recordMap).forEach(([id, record]) => {
    const value = getRecordValue(record)
    if (!value || typeof value !== 'object') return

    recordMap[id] = { value: cleanRecordValue(value) }
  })
}

function getRecordValue(record) {
  if (!record || typeof record !== 'object') return null
  if (record.value?.value) return record.value.value
  if (record.value) return record.value
  return record.id ? record : null
}

function cleanRecordValue(value) {
  const cleanedValue = { ...value }
  delete cleanedValue.version
  delete cleanedValue.created_by_table
  delete cleanedValue.created_by_id
  delete cleanedValue.last_edited_by_table
  delete cleanedValue.last_edited_by_id
  delete cleanedValue.space_id
  delete cleanedValue.parent_table
  delete cleanedValue.permissions
  delete cleanedValue.alive
  delete cleanedValue.role
  delete cleanedValue.copied_from_pointer
  delete cleanedValue.copied_from
  delete cleanedValue.created_time
  delete cleanedValue.last_edited_time
  return cleanedValue
}

function cleanBlockValue(value) {
  const cleanedValue = { ...value }

  delete cleanedValue.version
  delete cleanedValue.created_by_table
  delete cleanedValue.created_by_id
  delete cleanedValue.last_edited_by_table
  delete cleanedValue.last_edited_by_id
  delete cleanedValue.space_id
  delete cleanedValue.created_time
  delete cleanedValue.last_edited_time
  delete cleanedValue.parent_table
  delete cleanedValue.copied_from_pointer
  delete cleanedValue.copied_from
  delete cleanedValue.permissions
  delete cleanedValue.alive

  if (cleanedValue.format && typeof cleanedValue.format === 'object') {
    cleanedValue.format = { ...cleanedValue.format }
    delete cleanedValue.format.copied_from_pointer
    delete cleanedValue.format.block_locked_by

    if (Object.keys(cleanedValue.format).length === 0) {
      delete cleanedValue.format
    }
  }

  return cleanedValue
}

export function cleanPostForClient(post) {
  if (!post || typeof post !== 'object') return post

  const cleanedPost = { ...post }
  delete cleanedPost.content

  if (cleanedPost.blockMap) {
    cleanedPost.blockMap = cleanBlockMapForClient(cleanedPost.blockMap)
  }

  return cleanedPost
}
