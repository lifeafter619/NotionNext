describe('busuanzi JSONP rendering', () => {
  it('renders counters as text and releases the JSONP callback', () => {
    // 上游已默认走 Vercount API（非 JSONP）；JSONP 行为需显式配置端点
    process.env.NEXT_PUBLIC_BUSUANZI_SCRIPT_URL =
      '//busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback'

    document.body.innerHTML = `
      <span class='busuanzi_container_site_pv'>
        <span class='busuanzi_value_site_pv'></span>
      </span>
    `

    let busuanzi
    jest.isolateModules(() => {
      busuanzi = require('@/lib/plugins/busuanzi')
    })

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
