import {
  collectContentImageMeta,
  resolveNotionImageDimensions
} from '@/components/NotionPage'

jest.mock('react-notion-x', () => ({
  NotionRenderer: jest.fn(() => null)
}))

// Notion 官方静态资源 URL（notion.so/images/…）会被 mapImgUrl 原样返回，
// 用它构造 fixture 可以让断言不依赖代理包装与压缩参数
const makeBlockMap = () => ({
  block: {
    root: {
      value: {
        id: 'root',
        type: 'page',
        content: ['t1', 'col', 'sub', 'img2']
      }
    },
    t1: { value: { id: 't1', type: 'text' } },
    // 首图藏在 column 容器里，验证渲染序深度遍历
    col: { value: { id: 'col', type: 'column_list', content: ['img1'] } },
    img1: {
      value: {
        id: 'img1',
        type: 'image',
        properties: { source: [['https://www.notion.so/images/a.png']] },
        format: {
          block_width: 800,
          block_height: 42,
          block_aspect_ratio: 0.5
        }
      }
    },
    // 内嵌子页面在正文中只渲染为链接，里面的图不应参与收集
    sub: { value: { id: 'sub', type: 'page', content: ['img3'] } },
    img3: {
      value: {
        id: 'img3',
        type: 'image',
        properties: { source: [['https://www.notion.so/images/sub.png']] }
      }
    },
    img2: {
      value: {
        id: 'img2',
        type: 'image',
        properties: { source: [['https://www.notion.so/images/b.png']] }
      }
    }
  }
})

describe('collectContentImageMeta', () => {
  it('按渲染顺序取首图，并从 block format 收集宽高', () => {
    const meta = collectContentImageMeta(makeBlockMap(), 'root')
    expect(meta.first).toBe('https://www.notion.so/images/a.png')
    expect(meta.dims['https://www.notion.so/images/a.png']).toEqual({
      width: 800,
      height: 400
    })
  })

  it('跳过内嵌子页面里的图片', () => {
    const meta = collectContentImageMeta(makeBlockMap(), 'root')
    expect(meta.first).not.toBe('https://www.notion.so/images/sub.png')
    expect(meta.dims['https://www.notion.so/images/sub.png']).toBeUndefined()
  })

  it('rootId 不在 blockMap 时回退到第一个 page block', () => {
    const meta = collectContentImageMeta(makeBlockMap(), 'missing-id')
    expect(meta.first).toBe('https://www.notion.so/images/a.png')
  })

  it('空 blockMap 返回空元数据', () => {
    expect(collectContentImageMeta(null, 'root')).toEqual({
      first: null,
      dims: {}
    })
  })
})

describe('resolveNotionImageDimensions', () => {
  it('元数据完整时不与上游孤立高度混用', () => {
    expect(
      resolveNotionImageDimensions(null, 42, { width: 624, height: 200 })
    ).toEqual({ width: 624, height: 200 })
  })
})
