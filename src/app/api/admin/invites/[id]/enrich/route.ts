import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { fetchFupaProfile } from '@/lib/fupa-fetch'
import { enrichUpdate, type CurrentCardFields } from '@/lib/invite-enrich'
import { fetchAthlete, mapPosition } from '@/lib/base-athletes'
import { crestUpdateFor } from '@/lib/club-crest-server'
import type { FupaInviteStats } from '@/types'

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
  const { data: invite, error } = await db.from('showcase_invites').select('id, profile_url, photo_url, club, position, ausa_athlete_id, stats').eq('id', id).maybeSingle()
  if (error) return dbError(error.message)
  if (!invite) return NextResponse.json({ error: 'Einladung nicht gefunden' }, { status: 404 })
  const url = typeof invite.profile_url === 'string' ? invite.profile_url : null
  if (!url) return NextResponse.json({ error: 'Kein Profil-Link an dieser Einladung' }, { status: 400 })

  const result = await fetchFupaProfile(url)
  // A Base-linked player keeps Base's position (Max, 23.10: a mapped "RW" must not become FuPa's "Mittelfeld")
  const athlete = typeof invite.ausa_athlete_id === 'string' ? await fetchAthlete(db, invite.ausa_athlete_id).catch(() => null) : null
  const basePosition = athlete ? (mapPosition(athlete.position_primary) ?? mapPosition(athlete.position_soccer?.[0])) : null
  const read = enrichUpdate(result, invite as CurrentCardFields, new Date().toISOString(), basePosition)
  // No photo after the read: the club's crest (FuPa's team name first) fills the slot; a read that failed still gets it
  const after = { photo_url: (read?.photo_url ?? invite.photo_url ?? null) as string | null, club: (read?.club ?? invite.club ?? null) as string | null, stats: (read?.stats ?? invite.stats ?? null) as FupaInviteStats | null }
  const crest = await crestUpdateFor(after)
  const values = read || crest ? { ...(read ?? { updated_at: new Date().toISOString() }), ...(crest ?? {}) } : null
  const query = values ? db.from('showcase_invites').update(values).eq('id', id) : db.from('showcase_invites')
  const { data, error: readError } = await query.select(INVITE_WITH_PLAYER_SELECT).eq('id', id).maybeSingle()
  if (readError) return dbError(readError.message)
  return NextResponse.json({ ...data, enrichment: result.ok ? { source: result.source } : { failed: result.reason } })
}
