import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import NotionButton from '@/components/NotionButton'
import { useNotionContext } from 'react-notion-x'

jest.mock('react-notion-x', () => ({
  useNotionContext: jest.fn()
}))

describe('NotionButton', () => {
  beforeEach(() => {
    window.open = jest.fn()
  })

  it('renders the configured Notion automation name instead of the default Button label', () => {
    useNotionContext.mockReturnValue({
      recordMap: {
        automation: {
          automation1: {
            value: {
              id: 'automation1',
              action_ids: ['action1'],
              properties: {
                name: 'Open docs'
              }
            }
          }
        },
        automation_action: {
          action1: {
            value: {
              id: 'action1',
              type: 'open_page',
              config: {
                target: {
                  type: 'url',
                  url: 'https://example.com/docs'
                }
              }
            }
          }
        }
      },
      mapPageUrl: pageId => `/page/${pageId.replace(/-/g, '')}`
    })

    render(
      <NotionButton
        blockId='button1'
        block={{
          id: 'button1',
          type: 'button',
          format: {
            automation_id: 'automation1',
            block_color: 'blue_background'
          }
        }}
      />
    )

    const button = screen.getByRole('button', { name: 'Open docs' })
    expect(button).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Button' })
    ).not.toBeInTheDocument()

    fireEvent.click(button)

    expect(window.open).toHaveBeenCalledWith(
      'https://example.com/docs',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('falls back to the block title when automation records are missing', () => {
    useNotionContext.mockReturnValue({
      recordMap: {},
      mapPageUrl: pageId => `/page/${pageId}`
    })

    render(
      <NotionButton
        blockId='button1'
        block={{
          id: 'button1',
          type: 'button',
          properties: {
            title: [['Download report']]
          }
        }}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Download report' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Button' })
    ).not.toBeInTheDocument()
  })

  it('sends webhook actions through the local proxy endpoint', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })
    useNotionContext.mockReturnValue({
      recordMap: {
        block: {
          page1: {
            value: {
              id: 'page1',
              type: 'page'
            }
          }
        },
        automation: {
          automation1: {
            value: {
              id: 'automation1',
              action_ids: ['action1'],
              properties: {
                name: 'Notify'
              }
            }
          }
        },
        automation_action: {
          action1: {
            value: {
              id: 'action1',
              type: 'send_webhook',
              config: {
                url: 'https://hooks.example.com/notion',
                customHeaders: [{ key: 'X-Source', value: 'notion' }]
              }
            }
          }
        }
      },
      mapPageUrl: pageId => `/page/${pageId}`
    })

    render(
      <NotionButton
        blockId='button1'
        block={{
          id: 'button1',
          type: 'button',
          format: {
            automation_id: 'automation1'
          }
        }}
      />
    )

    const button = screen.getByRole('button', { name: 'Notify' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/webhook-proxy',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toEqual(
      expect.objectContaining({
        url: 'https://hooks.example.com/notion',
        headers: {
          'X-Source': 'notion'
        }
      })
    )
    expect(body.payload.source).toEqual(
      expect.objectContaining({
        automation_id: 'automation1',
        action_id: 'action1',
        button_id: 'button1'
      })
    )
    expect(body.payload.data.page_id).toBe('page1')
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })
})
