import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { newInviteToken } from '@/lib/invite-token'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { PROFILE_URL_ERROR, cleanProfileUrl, isProfileUrl } from '@/lib/profile-url'
import { fetchAthlete } from '@/lib/base-athletes'
import { baseInviteFields, definedFields, type BaseInviteFields } from '@/lib/base-invite'

export const dynamic = 'force-dynamic'

// Selection invites for one event: list + create. Admin basic auth or a Staff App login (middleware + here).

export async function GET(req: NextRequest) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from('showcase_invites')
    .select(INVITE_WITH_PLAYER_SELECT)
    .eq('event_id', eventId)
    .order('created_at')
  if (error) return dbError(error.message)
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

interface NewInvite {
  name?: unknown
  phone?: unknown
  invited_by?: unknown
  personal_line?: unknown
  profile_url?: unknown
  ausa_athlete_id?: unknown
  category?: unknown
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const clean = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export async function POST(req: NextRequest) {
  const { denied, staff } = await adminOrStaffAuth(req)
  if (denied) return denied
  // Same gate as /api/admin/db: a cross-site form could replay cached Basic credentials
  if (!isSameOriginJsonRequest(req)) return NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const eventId = clean(body?.eventId, 60)
  const rows: NewInvite[] = Array.isArray(body?.invites) ? body.invites : []
  if (!eventId || rows.length === 0) return NextResponse.json({ error: 'eventId and invites required' }, { status: 400 })
  if (rows.length > 100) return NextResponse.json({ error: 'Max 100 invites per request' }, { status: 400 })

  const db = createAdminClient()
  const inserts: ({ event_id: string; token: string; name: string; phone: string | null; invited_by: string; personal_line: string | null; ausa_athlete_id?: string; category?: string; invited_by_staff_id?: string; invited_by_email?: string | null } & Partial<BaseInviteFields>)[] = []
  for (const r of rows) {
    const name = clean(r.name, 120)
    const invited_by = clean(r.invited_by, 80)
    if (!name || !invited_by) return NextResponse.json({ error: 'Each invite needs a name and an inviter' }, { status: 400 })
    const profile_url = cleanProfileUrl(r.profile_url)
    if (profile_url && !isProfileUrl(profile_url)) return NextResponse.json({ error: `${name}: ${PROFILE_URL_ERROR}` }, { status: 400 })
    // Linked to a Base athlete: link, photo, club and position come from Base so the page is personal from the start
    const athleteId = typeof r.ausa_athlete_id === 'string' && UUID.test(r.ausa_athlete_id) ? r.ausa_athlete_id : null
    const athlete = athleteId ? await fetchAthlete(db, athleteId).catch(() => null) : null
    const base = athlete ? definedFields(baseInviteFields(athlete, profile_url)) : {}
    inserts.push({
      event_id: eventId,
      token: newInviteToken(),
      name,
      phone: clean(r.phone, 40),
      invited_by,
      personal_line: clean(r.personal_line, 300),
      // optional columns are only sent when given, so plain invites still save before their migrations run
      ...(profile_url ? { profile_url } : {}),
      ...base,
      ...(athleteId ? { ausa_athlete_id: athleteId } : {}),
      ...(r.category === 'signed' || r.category === 'new' ? { category: r.category } : {}),
      // who created it, from the Staff App login only; nothing the client sends for these is read
      ...(staff ? { invited_by_staff_id: staff.id, invited_by_email: staff.email } : {}),
    })
  }

  let { data, error } = await db.from('showcase_invites').insert(inserts).select(INVITE_WITH_PLAYER_SELECT)
  if (error && staff && /'invited_by_(staff_id|email)' column/.test(error.message)) {
    // staff identity migration (20261023000004) not applied yet: save the invites without it
    const plain = inserts.map((row) => {
      const copy = { ...row }
      delete copy.invited_by_staff_id
      delete copy.invited_by_email
      return copy
    })
    ;({ data, error } = await db.from('showcase_invites').insert(plain).select(INVITE_WITH_PLAYER_SELECT))
  }
  if (error) return dbError(error.message)
  return NextResponse.json(data)
}
