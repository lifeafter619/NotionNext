jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))
jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchNotionPageBlocks: jest.fn(),
  formatNotionBlock: jest.fn(block => block)
}))
jest.mock('@/lib/db/notion/getPageContentText', () => ({
  getPageContentText: jest.fn(() => '')
}))
jest.mock('@/lib/utils/notion.util', () => ({
  adapterNotionBlockMap: jest.fn(blockMap => blockMap)
}))

import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { fetchNotionPageBlocks } from '@/lib/db/notion/getPostBlocks'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import {
  buildSiteChatContext,
  selectRelevantArticles
} from '@/lib/ai/siteChatContext'

describe('site chat context', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('prioritizes the current article and filters protected/unpublished pages', () => {
    const posts = [
      { id: 'current', href: '/guide/start', title: 'Other' },
      { id: 'match', href: '/other', title: 'Vercel deployment' },
      {
        id: 'secret',
        href: '/secret',
        title: 'Vercel secret',
        password: 'hash'
      },
      { id: 'draft', href: '/draft', title: 'Vercel draft', status: 'Draft' }
    ]
    const selected = selectRelevantArticles(
      posts.filter(post => post.status !== 'Draft' && !post.password),
      'Vercel',
      '/zh-CN/guide/start'
    )
    expect(selected.map(post => post.id)).toEqual(['current', 'match'])
  })

  it('includes public text and directory metadata without image data', async () => {
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        {
          id: 'post-1',
          href: '/guide/start',
          title: '开始使用',
          summary: '入门',
          status: 'Published',
          type: 'Post',
          pageCover: 'https://img.example/cover.jpg'
        },
        {
          id: 'private',
          href: '/private',
          title: '私密',
          status: 'Published',
          type: 'Post',
          password: 'hash'
        },
        {
          id: 'draft',
          href: '/draft',
          title: '草稿',
          status: 'Draft',
          type: 'Post'
        }
      ]
    })
    fetchNotionPageBlocks.mockResolvedValue({ block: {} })
    getPageContentText.mockReturnValue('这是正文纯文本')

    const context = await buildSiteChatContext({
      question: '开始使用',
      currentPath: '/guide/start'
    })

    expect(context).toContain('这是正文纯文本')
    expect(context).toContain('开始使用')
    expect(context).not.toContain('私密')
    expect(context).not.toContain('草稿')
    expect(context).not.toContain('cover.jpg')
  })
})
