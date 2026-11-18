import { generateRssContent } from '@/lib/utils/rssFeed'

export async function getServerSideProps({ res, locale }) {
  try {
    const content = await generateRssContent({ locale })
    if (!content?.xml) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.write(JSON.stringify({ message: 'RSS feed not available' }))
      res.end()
      return { props: {} }
    }

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=3600'
    )
    res.write(content.xml)
    res.end()
  } catch (error) {
    console.error('[RSS page] Error generating feed:', error)
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.write(JSON.stringify({ message: 'Failed to generate RSS feed' }))
    res.end()
  }

  return {
    props: {}
  }
}

const FeedXml = () => null
export default FeedXml
