import BLOG from '@/blog.config'
import { getGlobalData } from '@/lib/db/getSiteData'

export async function getServerSideProps({ req, res, locale }) {
  const from = 'robots.txt'
  const props = await getGlobalData({ from, locale })

  const { siteInfo } = props
  const LINK = siteInfo?.link
  const content = `
    # *
    User-agent: *
    Allow: /

    # Host
    Host: ${LINK}

    # Sitemaps
    Sitemap: ${LINK}/sitemap.xml
    `

  res.setHeader('Content-Type', 'text/plain')
  // Cache for 1 day
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=59')
  res.write(content)
  res.end()

  return {
    props: {},
  }
}

const RobotsTxt = () => null
export default RobotsTxt
