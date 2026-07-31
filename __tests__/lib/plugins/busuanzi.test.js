import busuanzi from '@/lib/plugins/busuanzi'

describe('busuanzi JSONP rendering', () => {
  it('renders counters as text and releases the JSONP callback', () => {
    document.body.innerHTML = `
      <span class='busuanzi_container_site_pv'>
        <span class='busuanzi_value_site_pv'></span>
      </span>
    `

    busuanzi.fetch()
    const script = document.head.querySelector('script[src*="busuanzi"]')
    const callbackName = new URL(script.src).searchParams.get('jsonpCallback')

    window[callbackName]({ site_pv: '<img src=x>' })

    expect(document.querySelector('.busuanzi_value_site_pv')).toHaveTextContent(
      '<img src=x>'
    )
    expect(document.querySelector('.busuanzi_value_site_pv img')).toBeNull()
    expect(window[callbackName]).toBeUndefined()
  })
})
