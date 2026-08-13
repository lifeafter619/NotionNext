jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    if (key === 'AI_CHAT_API') return '/api/ai-chat'
    if (key === 'AI_CHAT_TITLE') return 'AI 助手'
    if (key === 'AI_CHAT_WELCOME') return '欢迎'
    return null
  })
}))

import { sanitizeChatPath } from '@/components/DocsChat'

describe('DocsChat', () => {
  it('sanitizes the current route before it is sent to the server', () => {
    expect(sanitizeChatPath('/guide/start?preview=1')).toBe('/guide/start')
    expect(sanitizeChatPath('/guide/start#section')).toBe('/guide/start')
    expect(sanitizeChatPath('https://evil.example')).toBe('/')
    expect(sanitizeChatPath('')).toBe('/')
  })
})
