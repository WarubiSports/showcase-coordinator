import { NextRequest, NextResponse } from 'next/server'

// Same basic-auth check as middleware, repeated inside admin API routes (defense in depth)
export const adminAuthError = (req: NextRequest): NextResponse | null => {
  const password = process.env.COORDINATOR_ADMIN_PASSWORD
  const username = process.env.COORDINATOR_ADMIN_USER || 'admin'
  const auth = req.headers.get('authorization')
  if (password && auth?.startsWith('Basic ')) {
    try {
      const [user, pass] = atob(auth.slice(6)).split(':')
      if (user === username && pass === password) return null
    } catch {
      // fall through
    }
  }
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}
