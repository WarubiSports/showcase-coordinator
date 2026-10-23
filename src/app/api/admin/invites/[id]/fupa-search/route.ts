import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { candidateProfileUrl, pickCandidate, searchFupaPlayers } from '@/lib/fupa-search'

export const dynamic = 'force-dynamic'

// "Find on FuPa" for an invite without a profile link: FuPa's player search for the invite name. A single hit, or
// one singled out by the invite's club, becomes the link (the page runs the FuPa read next); otherwise the hits
// are stored on the row for staff to pick from.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  if (!isSameOriginJsonRequest(req)) return NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })
  const { id } = await params

  const db = createAdminClient()
  const { data: invite, error } = await db.from('showcase_invites').select('id, name, club, profile_url').eq('id', id).maybeSingle()
  if (error) return dbError(error.message)
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (typeof invite.profile_url === 'string' && invite.profile_url) return NextResponse.json({ error: 'Invite already has a profile link' }, { status: 400 })

  const found = await searchFupaPlayers(String(invite.name ?? ''))
  if (!found) return NextResponse.json({ error: 'FuPa search not reachable' }, { status: 502 })
  const pick = pickCandidate(found, typeof invite.club === 'string' ? invite.club : null)
  const now = new Date().toISOString()
  const values = pick ? { profile_url: candidateProfileUrl(pick), fupa_candidates: null, updated_at: now } : { fupa_candidates: found, updated_at: now }

  const { data, error: writeError } = await db.from('showcase_invites').update(values).eq('id', id).select(INVITE_WITH_PLAYER_SELECT).maybeSingle()
  if (writeError) return dbError(writeError.message)
  return NextResponse.json({ ...data, fupa: pick ? { linked: true, hits: found.length } : { linked: false, hits: found.length } })
}
