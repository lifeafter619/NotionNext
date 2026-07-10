import { render, screen } from '@testing-library/react'
import NotionFile, { buildNotionFileDownloadUrl } from '@/components/NotionFile'

describe('NotionFile', () => {
  it('renders Notion hosted files as same-site download links', () => {
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
      '/api/notion-file?id=block-id&source=https%3A%2F%2Fnotion.so%2Fsigned%2Fattachment%253Afile-id%253Areport.zip%3Ftable%3Dblock%26id%3Dblock-id&filename=report.zip'
    )
    expect(link).not.toHaveAttribute('target')
    expect(screen.getByText('12 KB')).toBeInTheDocument()
  })

  it('leaves external file links untouched', () => {
    const href = buildNotionFileDownloadUrl({
      id: 'block-id',
      source: 'https://cdn.example.com/report.zip',
      filename: 'report.zip'
    })

    expect(href).toBe('https://cdn.example.com/report.zip')
  })

  it('does not build a Notion download URL without a block id', () => {
    const href = buildNotionFileDownloadUrl({
      source: 'attachment:file-id:report.zip',
      filename: 'report.zip'
    })

    expect(href).toBeNull()
  })
})
