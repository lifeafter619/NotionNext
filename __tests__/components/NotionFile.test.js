import { render, screen } from '@testing-library/react'
import NotionFile, {
  buildNotionFileApiUrl,
  buildNotionFileDownloadUrl
} from '@/components/NotionFile'

describe('NotionFile', () => {
  it('renders Notion hosted files as direct Worker download links', () => {
    render(
      <NotionFile
        block={{
          id: 'block-id',
          properties: {
            title: [['report.zip']],
            source: [
              [
                'https://notion.so/signed/attachment%3Afile-id%3Areport.zip?table=block&id=block-id'
              ]
            ],
            size: [['12 KB']]
          }
        }}
      />
    )

    const link = screen.getByRole('link', { name: /report.zip/i })
    expect(link).toHaveAttribute(
      'href',
      'https://img.cdn.619.pp.ua/signed/attachment%3Afile-id%3Areport.zip?table=block&id=block-id'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText('12 KB')).toBeInTheDocument()
  })

  it('keeps external file links on their original URL', () => {
    render(
      <NotionFile
        block={{
          id: 'block-id',
          properties: {
            title: [['report.zip']],
            source: [['https://downloads.example.com/report.zip']]
          }
        }}
      />
    )

    expect(screen.getByRole('link', { name: /report.zip/i })).toHaveAttribute(
      'href',
      'https://downloads.example.com/report.zip'
    )
  })

  it('leaves external file links untouched', () => {
    const href = buildNotionFileDownloadUrl({
      id: 'block-id',
      source: 'https://cdn.example.com/report.zip',
      filename: 'report.zip'
    })

    expect(href).toBe('https://cdn.example.com/report.zip')
  })

  it('does not treat an arbitrary S3 URL as a Notion-hosted file', () => {
    const source =
      'https://s3-us-west-2.amazonaws.com/my-public-bucket/report.zip'
    const href = buildNotionFileDownloadUrl({
      id: 'block-id',
      source,
      filename: 'report.zip'
    })

    expect(href).toBe(source)
  })

  it('builds a direct CDN download URL for a custom Notion host', () => {
    const href = buildNotionFileDownloadUrl({
      id: 'block-id',
      source:
        'https://notion.so/signed/attachment%3Afile-id%3Areport.zip?table=block&id=block-id',
      filename: 'report.zip',
      notionHost: 'https://img.cdn.619.pp.ua'
    })

    expect(href).toBe(
      'https://img.cdn.619.pp.ua/signed/attachment%3Afile-id%3Areport.zip?table=block&id=block-id'
    )
    expect(
      buildNotionFileApiUrl({
        id: 'block-id',
        source:
          'https://notion.so/signed/attachment%3Afile-id%3Areport.zip?table=block&id=block-id',
        filename: 'report.zip'
      })
    ).toContain('/api/notion-file?')
  })

  it('does not build a Notion download URL without a block id', () => {
    const href = buildNotionFileDownloadUrl({
      source: 'attachment:file-id:report.zip',
      filename: 'report.zip'
    })

    expect(href).toBeNull()
  })
})
