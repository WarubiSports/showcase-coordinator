import { NextRequest, NextResponse } from 'next/server'
import { getStaffIdentity } from '@/lib/staff-session'
import { STAFF_COOKIE } from '@/lib/staff-cookie'

const PUBLIC_FILE = /\.(.*)$/
// The one page that asks the browser for the admin password on purpose: the "Admin-Login mit Passwort" link on /login
const ADMIN_LOGIN_PATH = '/admin'

function isPublicRegistrationPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'event') return false
  // /event/<slug>, its link-preview image, and the organizer view (gated by its own link key)
  return parts.length === 2 || (parts.length === 3 && (parts[2].startsWith('opengraph-image') || parts[2] === 'organizer'))
}

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/registration-email') ||
    pathname.startsWith('/api/organizer/') ||
    pathname === '/api/itp-move-probe' ||
    // selection invite page + API: access is the unguessable token in the URL
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/api/invite/') ||
    // staff sign-in for the invite area
    pathname === '/login' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    (PUBLIC_FILE.test(pathname) && !pathname.startsWith('/api/')) ||
    isPublicRegistrationPath(pathname)
  )
}

// The invite area opens to the admin basic auth OR a Staff App login (staff session). Everything else
// (dashboard, Hawaii showcases, the admin db proxy and player routes) keeps basic auth as its only gate.
function isInviteArea(pathname: string) {
  return (
    pathname === '/invites' ||
    pathname.startsWith('/invites/') ||
    pathname.startsWith('/api/admin/invites') ||
    pathname.startsWith('/api/admin/athletes') ||
    pathname.startsWith('/api/admin/fupa-search') ||
    pathname === '/api/admin/me'
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

function basicAuthOk(req: NextRequest, username: string, password: string) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Basic ')) return false
  try {
    const [providedUser, providedPassword] = atob(auth.slice(6)).split(':')
    return providedUser === username && providedPassword === password
  } catch {
    return false
  }
}

const hasStaffCookie = (req: NextRequest) => req.cookies.getAll().some((c) => c.name.startsWith(STAFF_COOKIE))

const redirectTo = (req: NextRequest, pathname: string, params: Record<string, string> = {}) => {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return NextResponse.redirect(url)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const username = process.env.COORDINATOR_ADMIN_USER || 'admin'
  const password = process.env.COORDINATOR_ADMIN_PASSWORD

  if (!password) {
    return new NextResponse('Admin password is not configured', { status: 503 })
  }

  if (basicAuthOk(req, username, password)) {
    // The password page has done its job once the browser sends the credentials along
    return pathname === ADMIN_LOGIN_PATH ? redirectTo(req, '/') : NextResponse.next()
  }

  // Only here does a page answer with the browser's password box. Every other page redirects, so a staff
  // user coming from the Staff App login never meets it by accident (Marvin, 23.10), nor does a visitor.
  if (pathname === ADMIN_LOGIN_PATH) {
    return unauthorized()
  }

  if (isInviteArea(pathname)) {
    // Refreshed session cookies, if any, travel back on the response
    let response = NextResponse.next({ request: req })
    const staff = await getStaffIdentity(req, (cookies) => {
      response = NextResponse.next({ request: req })
      cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    })
    if (staff) return response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return redirectTo(req, '/login', { next: pathname + req.nextUrl.search })
  }

  if (pathname.startsWith('/api/')) {
    // A staff session calling an admin-only API (the sidebar's categories through the db proxy, say) gets a plain
    // JSON denial: a basic-auth challenge on a fetch would make the browser pop up its login dialog. Without a
    // session the challenge stays, the admin db loader signs in through it.
    return hasStaffCookie(req) ? NextResponse.json({ error: 'Admin login required' }, { status: 403 }) : unauthorized()
  }

  // Admin-only pages: a staff user is told where the border is, a visitor goes to the login page
  if (hasStaffCookie(req)) {
    return redirectTo(req, '/invites', { notice: 'admin-only' })
  }
  return redirectTo(req, '/login', { next: pathname + req.nextUrl.search })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
