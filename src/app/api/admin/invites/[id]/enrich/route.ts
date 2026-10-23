import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminAuthError } from '@/lib/admin-auth'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { fetchFupaProfile } from '@/lib/fupa'

export const dynamic = 'force-dynamic'

// Reads the FuPa page behind the invite's profile link (server side, never from the browser) and stores
// photo, club, league, position and this season's games, goals and assists on the invite. A failed read
// clears the stored data, so the player page shows nothing rather than something stale or wrong.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = adminAuthError(req)
  if (denied) return denied
  if (!isSameOriginJsonRequest(req)) return NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })
  const { id } = await params

  const db = createAdminClient()
  const { data: invite, error } = await db.from('showcase_invites').select('id, profile_url').eq('id', id).maybeSingle()
  if (error) return dbError(error.message)
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  const url = typeof invite.profile_url === 'string' ? invite.profile_url : null
  if (!url) return NextResponse.json({ error: 'No profile link on this invite' }, { status: 400 })

  const result = await fetchFupaProfile(url)
  const now = new Date().toISOString()
  const values = result.ok
    ? { ...result.profile, enriched_at: now, updated_at: now }
    : { photo_url: null, club: null, league: null, position: null, stats: null, enriched_at: null, updated_at: now }

  const { data, error: writeError } = await db.from('showcase_invites').update(values).eq('id', id).select(INVITE_WITH_PLAYER_SELECT).maybeSingle()
  if (writeError) return dbError(writeError.message)
  return NextResponse.json({ ...data, enrichment: result.ok ? { source: result.source } : { failed: result.reason } })
}
