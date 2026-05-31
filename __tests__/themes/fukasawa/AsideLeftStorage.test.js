import { render } from '@testing-library/react'
import AsideLeft from '@/themes/fukasawa/components/AsideLeft'

jest.mock('@/components/DarkModeButton', () => {
  return function DarkModeButton() {
    return null
  }
})
jest.mock('@/components/GoogleAdsense', () => ({
  AdSlot: () => null
}))
jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    const config = {
      DESCRIPTION: 'Site description',
      FUKASAWA_SIDEBAR_COLLAPSE_SATUS_DEFAULT: false,
      FUKASAWA_SIDEBAR_COLLAPSE_ON_SCROLL: false,
      FUKASAWA_SIDEBAR_COLLAPSE_BUTTON: true,
      LAYOUT_SIDEBAR_REVERSE: false
    }
    return config[key] ?? fallback
  })
}))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ fullWidth: false })
}))
jest.mock('@/lib/utils/debounce', () => ({
  debounce: fn => fn
}))
jest.mock('next/router', () => ({
  useRouter: () => ({ asPath: '/' })
}))
jest.mock('@/themes/fukasawa/components/Announcement', () => {
  return function Announcement() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/Catalog', () => {
  return function Catalog() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/GroupCategory', () => {
  return function GroupCategory() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/GroupTag', () => {
  return function GroupTag() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/Logo', () => {
  return function Logo() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/MailChimpForm', () => {
  return function MailChimpForm() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/MenuList', () => ({
  MenuList: () => null
}))
jest.mock('@/themes/fukasawa/components/SearchInput', () => {
  return function SearchInput() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/SiteInfo', () => {
  return function SiteInfo() {
    return null
  }
})
jest.mock('@/themes/fukasawa/components/SocialButton', () => {
  return function SocialButton() {
    return null
  }
})

describe('Fukasawa AsideLeft storage handling', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('falls back to the default collapsed state when localStorage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() =>
      render(<AsideLeft tagOptions={[]} categoryOptions={[]} />)
    ).not.toThrow()
  })
})
