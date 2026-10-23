import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { firstName } from '@/lib/german-date'

export const dynamic = 'force-dynamic'

// Public: what the invite page needs. Access = the unguessable token in the URL.
// Returns only the invited player's own data, never other invites.

const PLAYER_FIELDS =
  'name, birth_year, position, club, email, phone, parent_name, parent_phone, school_type, grad_year, grades, english_level, video_url, consent_profile_at, consent_social_at, consent_parent_name'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 16) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data, error } = await createAdminClient()
    .from('showcase_invites')
    .select(
      `id, status, name, phone, invited_by, responded_at, event:showcase_events(name, slug, start_date, end_date, start_time, end_time, location, description), player:showcase_players(${PLAYER_FIELDS})`,
    )
    .eq('token', token)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'unavailable', detail: error.message }, { status: 503 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { event, player, ...invite } = data
  return NextResponse.json(
    { invite: { ...invite, first_name: firstName(invite.name) }, event, player },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
