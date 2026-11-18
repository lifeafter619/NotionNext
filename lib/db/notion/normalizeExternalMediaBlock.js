export function normalizeExternalMediaBlock(blockValue) {
  if (!blockValue || typeof blockValue !== 'object') return

  const source = blockValue?.properties?.source?.[0]?.[0]
  if (blockValue.type !== 'video' || typeof source !== 'string') return

  // Apple Music single-track embeds can arrive as `video` blocks from Notion.
  // react-notion-x treats unknown `video` sources as native <video>, which breaks playback.
  if (isAppleMusicEmbedUrl(source) || isExternalVideoEmbedUrl(source)) {
    blockValue.type = 'embed'
  }
}

export function isAppleMusicEmbedUrl(url) {
  return /^https:\/\/embed\.music\.apple\.com\/.+\/song\//i.test(url)
}

export function isExternalVideoEmbedUrl(url) {
  try {
    const parsed = new URL(url)
    if (!/^https?:$/.test(parsed.protocol)) return false

    // react-notion-x already renders these providers with their dedicated
    // players when the block remains `video`.
    const nativeVideoProvider =
      /(?:youtube(?:-nocookie)?|youtu\.be|vimeo|wistia|loom|videoask|getcloudapp|tella|embed\.music\.apple\.com)/i.test(
        parsed.hostname
      )
    if (nativeVideoProvider) return false

    // Keep actual media files native so the browser can stream them directly.
    const directMediaFile = /\.(?:mp4|m4v|webm|ogv|ogg|mov|m3u8|mpd)$/i.test(
      parsed.pathname
    )
    return !directMediaFile
  } catch {
    return false
  }
}
