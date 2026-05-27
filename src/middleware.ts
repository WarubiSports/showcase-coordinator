import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

function isPublicRegistrationPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  return parts.length === 2 && parts[0] === 'event'
}

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/registration-email') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    PUBLIC_FILE.test(pathname) ||
    isPublicRegistrationPath(pathname)
  )
}

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="MLS Next Fest Admin", charset="UTF-8"',
    },
  })
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const username = process.env.COORDINATOR_ADMIN_USER || 'admin'
  const password = process.env.COORDINATOR_ADMIN_PASSWORD

  if (!password) {
    return new NextResponse('Admin password is not configured', { status: 503 })
  }

  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Basic ')) {
    return unauthorized()
  }

  try {
    const [providedUser, providedPassword] = atob(auth.slice(6)).split(':')
    if (providedUser === username && providedPassword === password) {
      return NextResponse.next()
    }
  } catch {
    // Fall through to unauthorized.
  }

  return unauthorized()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
