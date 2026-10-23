import { NextRequest, NextResponse } from 'next/server'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { searchFupaPlayers } from '@/lib/fupa-search'

export const dynamic = 'force-dynamic'

// FuPa player search for the add-invites panel, before an invite exists: exact-name hits for the typed name.
// Read only, nothing stored; the create route runs its own search again when no link comes along.
export async function GET(req: NextRequest) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 3) return NextResponse.json([])
  const found = await searchFupaPlayers(q)
  if (!found) return NextResponse.json({ error: 'FuPa search not reachable' }, { status: 502 })
  return NextResponse.json(found, { headers: { 'Cache-Control': 'no-store' } })
}
