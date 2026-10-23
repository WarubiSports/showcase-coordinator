import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { PROFILE_URL_ERROR, cleanProfileUrl, isProfileUrl } from '@/lib/profile-url'

// Edit or remove one invite. Staff can reset to invited or mark declined (a WhatsApp "kann nicht");
// accepted only comes from the player's form, because that is where the consent lives.

const clean = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

// Same gate as /api/admin/db: a cross-site form could replay cached Basic credentials
const crossSite = (req: NextRequest) =>
  isSameOriginJsonRequest(req) ? null : NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied: authDenied } = await adminOrStaffAuth(req)
  const denied = authDenied ?? crossSite(req)
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updated_at: now }

  if ('name' in body) {
    const name = clean(body.name, 120)
    if (!name) return NextResponse.json({ error: 'Der Name darf nicht leer sein' }, { status: 400 })
    updates.name = name
  }
  if ('phone' in body) updates.phone = clean(body.phone, 40)
  if ('personal_line' in body) updates.personal_line = clean(body.personal_line, 300)
  if ('club' in body) updates.club = clean(body.club, 120)
  // Staff can only dismiss the FuPa hits ([]) or reset them (null); hits themselves come from the search route
  if ('fupa_candidates' in body) {
    if (!(body.fupa_candidates === null || (Array.isArray(body.fupa_candidates) && body.fupa_candidates.length === 0))) {
      return NextResponse.json({ error: 'fupa_candidates can only be cleared here' }, { status: 400 })
    }
    updates.fupa_candidates = body.fupa_candidates
  }
  let linkChanged = false
  if ('profile_url' in body) {
    const profile_url = cleanProfileUrl(body.profile_url)
    if (profile_url && !isProfileUrl(profile_url)) return NextResponse.json({ error: PROFILE_URL_ERROR }, { status: 400 })
    updates.profile_url = profile_url
    linkChanged = true
    if (profile_url) updates.fupa_candidates = null
  }
  if ('ausa_athlete_id' in body) {
    const id = body.ausa_athlete_id
    if (id !== null && !(typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      return NextResponse.json({ error: 'ausa_athlete_id must be a uuid or null' }, { status: 400 })
    }
    updates.ausa_athlete_id = id
  }
  if ('category' in body) {
    if (body.category !== null && body.category !== 'signed' && body.category !== 'new') {
      return NextResponse.json({ error: 'category must be signed, new or null' }, { status: 400 })
    }
    updates.category = body.category
  }
  if ('invited_by' in body) {
    const by = clean(body.invited_by, 80)
    if (!by) return NextResponse.json({ error: 'invited_by cannot be empty' }, { status: 400 })
    updates.invited_by = by
  }
  if ('status' in body) {
    if (body.status !== 'invited' && body.status !== 'declined') {
      return NextResponse.json({ error: 'status must be invited or declined' }, { status: 400 })
    }
    updates.status = body.status
    updates.responded_at = body.status === 'declined' ? now : null
  }
  // Shirt number lives on the sign-up (showcase_players) row; only the invite's own row is reachable here
  let jersey: number | null | undefined
  if ('jersey_number' in body) {
    const n = body.jersey_number
    if (n !== null && !(Number.isInteger(n) && n >= 0 && n <= 99)) return NextResponse.json({ error: 'jersey_number must be 0 to 99 or null' }, { status: 400 })
    jersey = n
  }

  const db = createAdminClient()
  if (linkChanged) {
    // FuPa data belongs to the old link: clear it, the page shows nothing until the new link is read.
    // Before the enrichment migration these columns are missing; that error is ignored on purpose.
    await db.from('showcase_invites').update({ photo_url: null, club: null, league: null, position: null, stats: null, enriched_at: null }).eq('id', id)
  }
  let { data, error } = await db.from('showcase_invites').update(updates).eq('id', id).select(INVITE_WITH_PLAYER_SELECT).maybeSingle()
  if (error && 'fupa_candidates' in updates && /'fupa_candidates' column/.test(error.message)) {
    // migration 20261023000005 not applied yet: the rest of the change still goes through
    delete updates.fupa_candidates
    ;({ data, error } = await db.from('showcase_invites').update(updates).eq('id', id).select(INVITE_WITH_PLAYER_SELECT).maybeSingle())
  }
  if (error) return dbError(error.message)
  if (!data) return NextResponse.json({ error: 'Einladung nicht gefunden' }, { status: 404 })
  if (jersey === undefined) return NextResponse.json(data)
  const row = data as { player_id: string | null; player: Record<string, unknown> | null }
  if (!row.player_id) return NextResponse.json({ error: 'Für diese Einladung gibt es noch keine Zusage' }, { status: 400 })
  const { error: jerseyError } = await db.from('showcase_players').update({ jersey_number: jersey, updated_at: now }).eq('id', row.player_id)
  if (jerseyError) return dbError(jerseyError.message)
  return NextResponse.json({ ...data, player: row.player ? { ...row.player, jersey_number: jersey } : null })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied: authDenied } = await adminOrStaffAuth(req)
  const denied = authDenied ?? crossSite(req)
  if (denied) return denied
  const { id } = await params
  const { error } = await createAdminClient().from('showcase_invites').delete().eq('id', id)
  if (error) return dbError(error.message)
  return NextResponse.json({ success: true })
}
