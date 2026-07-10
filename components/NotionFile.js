import NotionLink from '@/components/NotionLink'

const NOTION_FILE_SOURCE_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'file.notion.com',
  'notionusercontent.com',
  'secure.notion-static.com',
  's3-us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  'prod-files-secure-euc1.s3.eu-central-1.amazonaws.com',
  'prod-files-secure-apne1.s3.ap-northeast-1.amazonaws.com',
  'prod-files-secure-apne2.s3.ap-northeast-2.amazonaws.com'
]

export function buildNotionFileDownloadUrl({ id, source, filename }) {
  if (!source) return null
  if (!isNotionHostedFileSource(source)) return source
  if (!id) return null

  const params = new URLSearchParams()
  params.set('id', id)
  params.set('source', source)
  if (filename) params.set('filename', filename)
  return `/api/notion-file?${params.toString()}`
}

export default function NotionFile({ block, className }) {
  const source = block?.properties?.source?.[0]?.[0]
  const title = getPlainText(block?.properties?.title) || 'File'
  const size = getPlainText(block?.properties?.size)
  const href = buildNotionFileDownloadUrl({
    id: block?.id,
    source,
    filename: title
  })

  if (!href) return null

  return (
    <div className={['notion-file', className].filter(Boolean).join(' ')}>
      <NotionLink className='notion-file-link' href={href}>
        <FileIcon className='notion-file-icon' />
        <div className='notion-file-info'>
          <div className='notion-file-title'>{title}</div>
          {size && <div className='notion-file-size'>{size}</div>}
        </div>
      </NotionLink>
    </div>
  )
}

function isNotionHostedFileSource(source) {
  if (typeof source !== 'string') return false
  if (source.startsWith('attachment:')) return true

  try {
    const url = new URL(source)
    if (url.protocol !== 'https:') return false

    const hostname = url.hostname.toLowerCase()
    return NOTION_FILE_SOURCE_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

function getPlainText(value) {
  if (!Array.isArray(value)) return ''

  return value
    .map(segment => {
      if (!Array.isArray(segment)) return ''
      return typeof segment[0] === 'string' ? segment[0] : ''
    })
    .join('')
    .trim()
}

function FileIcon(props) {
  return (
    <svg {...props} viewBox='0 0 30 30' aria-hidden='true' focusable='false'>
      <path d='M22,8v12c0,3.866-3.134,7-7,7s-7-3.134-7-7V8c0-2.762,2.238-5,5-5s5,2.238,5,5v12c0,1.657-1.343,3-3,3s-3-1.343-3-3V8h-2v12c0,2.762,2.238,5,5,5s5-2.238,5-5V8c0-3.866-3.134-7-7-7S6,4.134,6,8v12c0,4.971,4.029,9,9,9s9-4.029,9-9V8H22z' />
    </svg>
  )
}
