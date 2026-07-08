import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

/**
 * Clerk 身份验证代理
 */
export const config = {
  // 这里设置白名单，防止静态资源被拦截
  matcher: ['/((?!.*\\..*|_next|/sign-in|/auth).*)', '/', '/(api|trpc)(.*)']
}

// 限制登录访问的路由
const isTenantRoute = createRouteMatcher([
  '/user/organization-selector(.*)',
  '/user/orgid/(.*)',
  '/dashboard',
  '/dashboard/(.*)'
])

// 限制权限访问的路由
const isTenantAdminRoute = createRouteMatcher([
  '/admin/(.*)/memberships',
  '/admin/(.*)/domain'
])

const PUBLIC_PAGE_CACHE_CONTROL =
  'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'

const NON_PUBLIC_PAGE_ROOTS = new Set([
  'api',
  'trpc',
  '_next',
  'auth',
  'sign-in',
  'sign-up',
  'dashboard',
  'admin',
  'user'
])

function getRouteRoot(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return ''
  const firstSegment = segments[0] || ''
  if (NON_PUBLIC_PAGE_ROOTS.has(firstSegment)) return firstSegment
  return segments[1] || firstSegment
}

function shouldCachePublicPage(req: NextRequest) {
  const method = req.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return false

  if (NON_PUBLIC_PAGE_ROOTS.has(getRouteRoot(req.nextUrl.pathname)))
    return false

  if (req.headers.get('authorization')) return false

  const cookie = req.headers.get('cookie') || ''
  return (
    !cookie.includes('__prerender_bypass') &&
    !cookie.includes('__next_preview_data')
  )
}

function withPublicPageCache(req: NextRequest, response: NextResponse) {
  if (shouldCachePublicPage(req)) {
    response.headers.set('Cache-Control', PUBLIC_PAGE_CACHE_CONTROL)
  }
  return response
}

/**
 * 没有配置权限相关功能的返回
 * @param req
 * @param ev
 * @returns
 */
const noAuthProxy = async (req: NextRequest) => {
  // 如果没有配置 Clerk 相关环境变量，返回一个默认响应或者继续处理请求
  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const response = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (response.ok) {
        redirectJson = (await response.json()) as Record<string, string>
      }
    } catch (err) {
      console.error('Error fetching static file:', err)
    }
    let lastPart = getLastPartOfUrl(req.nextUrl.pathname) as string
    if (checkStrIsNotionId(lastPart)) {
      lastPart = idToUuid(lastPart)
    }
    if (lastPart && redirectJson[lastPart]) {
      const redirectToUrl = req.nextUrl.clone()
      redirectToUrl.pathname = '/' + redirectJson[lastPart]
      console.log(
        `redirect from ${req.nextUrl.pathname} to ${redirectToUrl.pathname}`
      )
      return NextResponse.redirect(redirectToUrl, 308)
    }
  }
  return withPublicPageCache(req, NextResponse.next())
}
/**
 * 鉴权代理
 */
const authProxy = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware(async (auth, req) => {
      const { userId } = await auth()
      // 处理 /dashboard 路由的登录保护
      if (isTenantRoute(req)) {
        if (!userId) {
          // 用户未登录，重定向到 /sign-in
          const url = new URL('/sign-in', req.url)
          url.searchParams.set('redirectTo', req.url) // 保存重定向目标
          return NextResponse.redirect(url)
        }
      }

      // 处理管理员相关权限保护
      if (isTenantAdminRoute(req)) {
        await auth.protect(has => {
          return has({ role: 'org:admin' })
        })
      }

      // 默认继续处理请求
      return withPublicPageCache(req, NextResponse.next())
    })
  : noAuthProxy

export default authProxy
