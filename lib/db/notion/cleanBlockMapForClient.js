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
  cleanDerivableSignedUrls(cleanedBlockMap)

  return cleanedBlockMap
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
