import { mapImgUrl } from '@/lib/db/notion/mapImage'

describe('mapImgUrl Notion proxy boundary', () => {
  const block = {
    id: 'block-id',
    type: 'bookmark',
    format: {}
  }

  it('keeps ordinary external and bookmark images on their original URL', () => {
    const source = 'https://images.example.com/cover.jpg?token=original'

    expect(mapImgUrl(source, block)).toBe(source)
  })

  it('unwraps legacy custom-proxy URLs that contain an external image', () => {
    const source = 'https://images.example.com/cover.jpg?token=original'
    const wrapped = `https://img.cdn.619.pp.ua/image/${encodeURIComponent(source)}?table=block&id=block-id`

    expect(mapImgUrl(wrapped, block)).toBe(source)
  })

  it('unwraps Notion image URLs when their inner source is external', () => {
    const source = 'https://images.example.com/cover.jpg?token=original'
    const wrapped = `https://www.notion.so/image/${encodeURIComponent(source)}?table=block&id=block-id`

    expect(mapImgUrl(wrapped, block)).toBe(source)
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
