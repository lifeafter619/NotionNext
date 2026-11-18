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
      // publishDate 是数值时间戳（含时分秒）；publishDay 只是按日展示的
      // 字符串，用它排序会让同一天发布的文章顺序不稳定。
      const dateA = new Date(a.publishDate ?? a.publishDay ?? 0)
      const dateB = new Date(b.publishDate ?? b.publishDay ?? 0)
      return dateB - dateA
    })
    .slice(0, 20)
}

export function buildRssPostLink(siteLink, slug) {
  const normalizedSiteLink = String(siteLink || '').replace(/\/+$/, '')
  const slugWithoutLeadingSlash = String(slug || '').replace(/^\/+/, '')
  return `${normalizedSiteLink}/${slugWithoutLeadingSlash}`
}
