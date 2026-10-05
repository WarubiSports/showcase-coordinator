import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isValidOrganizerKey, organizerSlugs } from '@/lib/organizer-link'
import { getEventOverride } from '@/lib/event-overrides'

export const dynamic = 'force-dynamic'

// Registrations for the organizer view. Public route; access = valid organizer key for the slug.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isValidOrganizerKey(slug, req.nextUrl.searchParams.get('key'))) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const db = createAdminClient()
  const { data: events, error: eventsError } = await db
    .from('showcase_events')
    .select('id, slug, name, start_date, start_time, end_time, location, price, currency')
    .in('slug', organizerSlugs(slug))
    .order('start_date')
  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 })

  const { data: players, error: playersError } = await db
    .from('showcase_players')
    .select('id, event_id, name, email, phone, birth_year, position, club, country, parent_name, parent_email, parent_phone, payment_status, registered_at, created_at')
    .in('event_id', (events ?? []).map((e) => e.id))
    .order('created_at')
  if (playersError) return NextResponse.json({ error: playersError.message }, { status: 500 })

  return NextResponse.json(
    {
      events: (events ?? []).map((e) => ({ ...e, players: (players ?? []).filter((p) => p.event_id === e.id) })),
      payment: getEventOverride(slug).payment ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
