import { getServerSideProps } from '@/pages/rss/feed.xml'
import { generateRssContent } from '@/lib/utils/rssFeed'

jest.mock('@/lib/utils/rssFeed', () => ({
  generateRssContent: jest.fn()
}))

describe('/rss/feed.xml', () => {
  it('serves the same reliable runtime feed as the RSS API', async () => {
    generateRssContent.mockResolvedValue({ xml: '<rss>ok</rss>' })
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      write: jest.fn(),
      end: jest.fn()
    }

    const result = await getServerSideProps({ res, locale: 'zh-CN' })

    expect(generateRssContent).toHaveBeenCalledWith({ locale: 'zh-CN' })
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/rss+xml; charset=utf-8'
    )
    expect(res.write).toHaveBeenCalledWith('<rss>ok</rss>')
    expect(res.end).toHaveBeenCalled()
    expect(result).toEqual({ props: {} })
  })
})
