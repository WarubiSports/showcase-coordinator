import { NextRequest, NextResponse } from 'next/server'
import { adminOrStaffAuth } from '@/lib/staff-auth'

export const dynamic = 'force-dynamic'

// Who is signed in to the invite area: the staff profile behind the session, or null under the basic-auth login
export async function GET(req: NextRequest) {
  const { denied, staff } = await adminOrStaffAuth(req)
  if (denied) return denied
  return NextResponse.json({ staff }, { headers: { 'Cache-Control': 'no-store' } })
}
