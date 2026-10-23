import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { firstName } from '@/lib/german-date'

export const dynamic = 'force-dynamic'

// Public: what the invite page needs. Access = the unguessable token in the URL.
// Returns only the invited player's own data, never other invites.

// The rows are selected whole (a column added by a later migration must not break the page) and cut down here
const INVITE_FIELDS = ['id', 'status', 'name', 'phone', 'invited_by', 'responded_at', 'profile_url'] as const
const PLAYER_FIELDS = [
  'name', 'birth_year', 'position', 'club', 'email', 'phone', 'parent_name', 'parent_phone', 'school_type', 'grad_year', 'grades',
  'english_level', 'video_url', 'profile_url', 'consent_profile_at', 'consent_social_at', 'consent_parent_name',
] as const

const pick = (row: Record<string, unknown> | null, fields: readonly string[]) =>
  row ? Object.fromEntries(fields.map((f) => [f, row[f] ?? null])) : null

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 16) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data, error } = await createAdminClient()
    .from('showcase_invites')
    .select('*, event:showcase_events(name, slug, start_date, end_date, start_time, end_time, location, description), player:showcase_players(*)')
    .eq('token', token)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'unavailable', detail: error.message }, { status: 503 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { event, player, ...row } = data
  const invite = pick(row, INVITE_FIELDS) as Record<string, unknown> & { name: string }
  return NextResponse.json(
    { invite: { ...invite, first_name: firstName(invite.name) }, event, player: pick(player as Record<string, unknown> | null, PLAYER_FIELDS) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
