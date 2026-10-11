import BLOG from '@/blog.config'
import { mapImgUrl } from '@/lib/db/notion/mapImage'

describe('mapImgUrl Notion proxy boundary', () => {
  const block = {
    id: 'block-id',
    type: 'bookmark',
    format: {}
  }

  it('routes Notion builtin icons to the proxy host without extra params', () => {
    expect(mapImgUrl('https://www.notion.so/icons/downward_blue.svg', block)).toBe(
      `${BLOG.NOTION_HOST}/icons/downward_blue.svg`
    )
    // 相对路径同样落到代理域名
    expect(mapImgUrl('/icons/downward_pink.svg', block, 'block', false)).toBe(
      `${BLOG.NOTION_HOST}/icons/downward_pink.svg`
    )
  })

  it('maps the written-by-human badge to the existing local asset', () => {
    const wrapped =
      'https://img.cdn.619.pp.ua/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2Fid%2FWritten-By-Human-Not-By-AI-Badge-black.svg?table=block&id=block-id'

    expect(mapImgUrl(wrapped, block)).toBe(
      '/svg/not-by-ai/zh/Written-By-Human-Not-By-AI-Badge-black.svg'
    )
  })

  it('routes ordinary external and bookmark images through the Notion proxy', () => {
    const source = 'https://images.example.com/cover.jpg?token=original'
    const result = mapImgUrl(source, block)

    expect(result).toContain(`${BLOG.NOTION_HOST}/image/`)
    expect(result).toContain(encodeURIComponent(source))
    expect(result).toContain('table=block')
    expect(result).toContain('id=block-id')
  })

  it('rewraps legacy custom-proxy URLs onto the current proxy host', () => {
    const source = 'https://images.example.com/cover.jpg?token=original'
    const wrapped = `https://img.cdn.619.pp.ua/image/${encodeURIComponent(source)}?table=block&id=block-id`
    const result = mapImgUrl(wrapped, block)

    // 旧包装先还原出真实外链，再统一包装到当前代理域名，恰好一层 /image/
    expect(result.split('/image/')).toHaveLength(2)
    expect(result).toContain(`${BLOG.NOTION_HOST}/image/`)
    expect(result).toContain(encodeURIComponent(source))
  })

  it('rewraps Notion image URLs whose inner source is external', () => {
    const source = 'https://images.example.com/cover.jpg?token=original'
    const wrapped = `https://www.notion.so/image/${encodeURIComponent(source)}?table=block&id=block-id`
    const result = mapImgUrl(wrapped, block)

    expect(result.split('/image/')).toHaveLength(2)
    expect(result).toContain(`${BLOG.NOTION_HOST}/image/`)
  })

  it('continues proxying Notion-hosted attachment images', () => {
    const result = mapImgUrl(
      'attachment:image-id:cover.png',
      { ...block, type: 'image' },
      'block',
      false
    )

    expect(result).toContain(
      `https://img.cdn.619.pp.ua/image/${encodeURIComponent('attachment:image-id:cover.png')}`
    )
  })

  it('continues proxying legacy Notion S3 image paths', () => {
    const source =
      'https://s3-us-west-2.amazonaws.com/secure.notion-static.com/image-id/cover.png'
    const result = mapImgUrl(
      source,
      { ...block, type: 'image' },
      'block',
      false
    )

    expect(result).toContain(
      `https://img.cdn.619.pp.ua/image/${encodeURIComponent(source)}`
    )
  })
})
