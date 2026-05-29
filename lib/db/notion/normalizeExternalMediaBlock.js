export function normalizeExternalMediaBlock(blockValue) {
  if (!blockValue || typeof blockValue !== 'object') return

  const source = blockValue?.properties?.source?.[0]?.[0]
  if (blockValue.type !== 'video' || typeof source !== 'string') return

  // Apple Music single-track embeds can arrive as `video` blocks from Notion.
  // react-notion-x treats unknown `video` sources as native <video>, which breaks playback.
  if (isAppleMusicEmbedUrl(source)) {
    blockValue.type = 'embed'
  }
}

export function isAppleMusicEmbedUrl(url) {
  return /^https:\/\/embed\.music\.apple\.com\/.+\/song\//i.test(url)
}
