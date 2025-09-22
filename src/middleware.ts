import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting function
function rateLimit(ip: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const key = `${ip}:${Math.floor(now / windowMs)}`

  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs }

  if (current.count >= limit) {
    return false
  }

  current.count++
  rateLimitStore.set(key, current)

  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k)
    }
  }

  return true
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
    const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard')
    const isProfileRoute = req.nextUrl.pathname.startsWith('/profile')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')

    // Get client IP for rate limiting
    const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Rate limiting for API routes
    if (isApiRoute) {
      if (!rateLimit(ip, 1000, 60 * 1000)) { // 1000 requests per minute
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '1000',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
          },
        })
      }
    }

    // Stricter rate limiting for auth endpoints
    if (isAuthPage) {
      if (!rateLimit(`auth:${ip}`, 10, 60 * 1000)) { // 10 requests per minute for auth
        return new NextResponse('Too Many Authentication Attempts', {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        })
      }

      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return null
    }

    if (!isAuth && (isDashboardRoute || isProfileRoute)) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url)
      )
    }

    if (isAdminRoute && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Add security headers
    const response = NextResponse.next()

    // Security headers for sensitive pages
    if (isAdminRoute || isDashboardRoute || isProfileRoute) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    }

    // Add request ID for tracking
    response.headers.set('X-Request-ID', crypto.randomUUID())

    return response
  },
  {
    callbacks: {
      authorized: ({ token }) => true,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/auth/:path*',
  ],
}