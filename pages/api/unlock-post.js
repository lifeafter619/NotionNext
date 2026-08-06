import { resolvePostProps } from '@/lib/db/SiteDataApi'
import { createHash, timingSafeEqual } from 'crypto'

const digest = (algorithm, value) =>
  createHash(algorithm).update(String(value)).digest('hex')

const equalDigest = (candidate, expected) => {
  const left = Buffer.from(candidate, 'hex')
  const right = Buffer.from(String(expected), 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

export const verifyPostPassword = (post, password) => {
  const expected = post?.password
  if (!/^(?:[a-f\d]{32}|[a-f\d]{64})$/i.test(expected || '')) return false

  return [
    digest('sha256', password),
    digest('md5', String(post.slug || '') + password)
  ].some(candidate => equalDigest(candidate, expected))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { postId, password, locale } = req.body || {}
  if (
    !/^[a-f\d-]{32,36}$/i.test(postId || '') ||
    typeof password !== 'string' ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  const props = await resolvePostProps({
    prefix: postId,
    locale: typeof locale === 'string' && locale.length <= 20 ? locale : null,
    from: 'unlock-post',
    includeProtectedContent: true
  })
  if (!verifyPostPassword(props.post, password)) {
    return res.status(403).json({ error: 'Invalid password' })
  }

  const post = { ...props.post }
  delete post.password
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ post })
}
