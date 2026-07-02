import { render } from '@testing-library/react'
import ShareButtons from '@/components/ShareButtons'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      LINK: 'https://blog.example.com',
      POSTS_SHARE_SERVICES: 'facebook,qq,wechat,link,csdn,juejin',
      TITLE: 'Test Site'
    }
    return config[key] ?? ''
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        URL_COPIED: 'Copied',
        SCAN_QR_CODE: 'Scan'
      }
    }
  })
}))

describe('ShareButtons responsive layout', () => {
  it('prevents share buttons from shrinking inside wrapped rows', () => {
    const { container } = render(
      <ShareButtons
        post={{
          title: 'Post',
          summary: 'Summary',
          tags: []
        }}
      />
    )

    const buttons = Array.from(container.querySelectorAll('button'))

    expect(buttons).toHaveLength(6)
    buttons.forEach(button => {
      expect(button).toHaveClass('flex-shrink-0')
    })
  })
})
