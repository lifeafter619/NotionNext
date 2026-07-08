export function resolveArticleCopyrightText({ post, locale, mode }) {
  const normalizedMode =
    typeof mode === 'string' ? mode.trim().toLowerCase() : mode
  const rawCopyright = post?.copyright
  const customCopyright =
    typeof rawCopyright === 'string' ? rawCopyright.trim() : rawCopyright
  const hasCustomCopyright =
    customCopyright !== undefined &&
    customCopyright !== null &&
    String(customCopyright).trim() !== ''

  if (normalizedMode === false || normalizedMode === 'false') {
    return ''
  }

  if (normalizedMode === 'custom' && !hasCustomCopyright) {
    return ''
  }

  return hasCustomCopyright
    ? customCopyright
    : locale?.COMMON?.COPYRIGHT_NOTICE || ''
}
