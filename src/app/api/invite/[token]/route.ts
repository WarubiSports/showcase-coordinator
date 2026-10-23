import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { firstName } from '@/lib/german-date'
import { fetchAthlete, toPrefill, type BasePrefill } from '@/lib/base-athletes'

export const dynamic = 'force-dynamic'

// Public: what the invite page needs. Access = the unguessable token in the URL.
// Returns only the invited player's own data, never other invites.

// The rows are selected whole (a column added by a later migration must not break the page) and cut down here
const INVITE_FIELDS = ['id', 'status', 'name', 'phone', 'invited_by', 'responded_at', 'profile_url', 'ausa_athlete_id', 'category'] as const
const PLAYER_FIELDS = [
  'name', 'birth_year', 'position', 'club', 'email', 'phone', 'parent_name', 'parent_phone', 'school_type', 'grad_year', 'grades',
  'english_level', 'video_url', 'profile_url', 'consent_profile_at', 'consent_social_at', 'consent_parent_name',
] as const

const digits = (v: unknown) => (typeof v === 'string' ? v.replace(/\D/g, '').replace(/^0049/, '49').replace(/^0/, '49') : '')
const samePhone = (a: unknown, b: unknown) => {
  const x = digits(a)
  const y = digits(b)
  return x.length >= 8 && y.length >= 8 && x.slice(-9) === y.slice(-9)
}

const pick = (row: Record<string, unknown> | null, fields: readonly string[]) =>
  row ? Object.fromEntries(fields.map((f) => [f, row[f] ?? null])) : null

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 16) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('showcase_invites')
    .select('*, event:showcase_events(name, slug, start_date, end_date, start_time, end_time, location, description), player:showcase_players(*)')
    .eq('token', token)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'unavailable', detail: error.message }, { status: 503 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { event, player, ...row } = data
  const invite = pick(row, INVITE_FIELDS) as Record<string, unknown> & { name: string }

  // Linked to a Base athlete: the form opens prefilled from there (read only). Base unreachable = no prefill, page still works.
  let base: { name: string | null; photo_url: string | null; prefill: BasePrefill } | null = null
  if (typeof row.ausa_athlete_id === 'string') {
    try {
      const athlete = await fetchAthlete(db, row.ausa_athlete_id)
      if (athlete) {
        const prefill = toPrefill(athlete)
        // The link is a bearer token. Base's parent contact and grades are released to it only when the number
        // staff put on the invite is the number Base knows, which is the check that the right person was linked.
        if (!samePhone(row.phone, prefill.phone)) {
          prefill.parent_name = null
          prefill.parent_phone = null
          prefill.grades = null
          prefill.phone = null
        }
        base = { name: prefill.name, photo_url: prefill.photo_url, prefill }
      }
    } catch {
      base = null
    }
  }

  return NextResponse.json(
    { invite: { ...invite, first_name: firstName(invite.name) }, event, player: pick(player as Record<string, unknown> | null, PLAYER_FIELDS), base },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
