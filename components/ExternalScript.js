import Script from 'next/script'

/**
 * 自定义外部 script
 * 使用 next/script 进行优化
 * @returns
 */
const ExternalScript = props => {
  const { src } = props
  if (!src) {
    return null
  }

  // next/script automatically handles deduplication and loading strategies
  return <Script {...props} strategy="lazyOnload" />
}

export default ExternalScript
