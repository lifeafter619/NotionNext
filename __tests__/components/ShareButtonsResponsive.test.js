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

  it('centers icon glyphs inside the circular share buttons', () => {
    const { container } = render(
      <ShareButtons
        post={{
          title: 'Post',
          summary: 'Summary',
          tags: []
        }}
      />
    )

    const fontAwesomeIcons = Array.from(container.querySelectorAll('i'))

    expect(fontAwesomeIcons.length).toBeGreaterThan(0)
    fontAwesomeIcons.forEach(icon => {
      expect(icon).toHaveClass('!inline-flex')
      expect(icon).toHaveClass('!h-4')
      expect(icon).toHaveClass('!w-4')
      expect(icon).toHaveClass('items-center')
      expect(icon).toHaveClass('justify-center')
      expect(icon).toHaveClass('leading-none')
    })

    const csdnIcon = container.querySelector('img[alt="CSDN"]')
    expect(csdnIcon).not.toHaveStyle({ transform: 'translateY(3px)' })
  })
})
