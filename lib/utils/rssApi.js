export function getPublicRssPosts(allPages) {
  if (!Array.isArray(allPages)) return []

  return allPages
    .filter(
      post =>
        post?.type === 'Post' &&
        post?.status === 'Published' &&
        (!post.password || post.password === '')
    )
    .sort((a, b) => {
      const dateA = new Date(a.publishDay || a.publishDate || 0)
      const dateB = new Date(b.publishDay || b.publishDate || 0)
      return dateB - dateA
    })
    .slice(0, 20)
}

export function buildRssPostLink(siteLink, slug) {
  const normalizedSiteLink = String(siteLink || '').replace(/\/+$/, '')
  const slugWithoutLeadingSlash = String(slug || '').replace(/^\/+/, '')
  return `${normalizedSiteLink}/${slugWithoutLeadingSlash}`
}
