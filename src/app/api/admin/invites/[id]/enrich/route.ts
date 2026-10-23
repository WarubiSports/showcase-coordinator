import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { fetchFupaProfile } from '@/lib/fupa-fetch'
import { enrichUpdate, type CurrentCardFields } from '@/lib/invite-enrich'

export const dynamic = 'force-dynamic'

// Reads the FuPa page behind the invite's profile link (server side, never from the browser) and stores
// photo, club, league, position and this season's games, goals and assists on the invite. A failed read
// writes nothing: values from Base (or an earlier read) stay on the card.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  if (!isSameOriginJsonRequest(req)) return NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })
  const { id } = await params

  const db = createAdminClient()
  const { data: invite, error } = await db.from('showcase_invites').select('id, profile_url, photo_url, club, position').eq('id', id).maybeSingle()
  if (error) return dbError(error.message)
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  const url = typeof invite.profile_url === 'string' ? invite.profile_url : null
  if (!url) return NextResponse.json({ error: 'No profile link on this invite' }, { status: 400 })

  const result = await fetchFupaProfile(url)
  const values = enrichUpdate(result, invite as CurrentCardFields, new Date().toISOString())
  const query = values ? db.from('showcase_invites').update(values).eq('id', id) : db.from('showcase_invites')
  const { data, error: readError } = await query.select(INVITE_WITH_PLAYER_SELECT).eq('id', id).maybeSingle()
  if (readError) return dbError(readError.message)
  return NextResponse.json({ ...data, enrichment: result.ok ? { source: result.source } : { failed: result.reason } })
}
