export function cleanBlockMapForClient(blockMap) {
  if (!blockMap?.block) return blockMap

  const cleanedBlocks = {}

  for (const [id, block] of Object.entries(blockMap.block)) {
    const cleanedBlock = { ...block }
    delete cleanedBlock.role

    if (cleanedBlock.value && typeof cleanedBlock.value === 'object') {
      cleanedBlock.value = cleanBlockValue(cleanedBlock.value)
    }

    cleanedBlocks[id] = cleanedBlock
  }

  return {
    ...blockMap,
    block: cleanedBlocks
  }
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
