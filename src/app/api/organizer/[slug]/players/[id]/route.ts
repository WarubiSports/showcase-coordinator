import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isValidOrganizerKey, organizerSlugs } from '@/lib/organizer-link'

// Organizer marks a registration paid / unpaid (the only edit the organizer link allows)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  if (!isValidOrganizerKey(slug, req.nextUrl.searchParams.get('key'))) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const { payment_status } = await req.json()
  if (payment_status !== 'paid' && payment_status !== 'pending') {
    return NextResponse.json({ error: 'payment_status must be paid or pending' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: events } = await db.from('showcase_events').select('id').in('slug', organizerSlugs(slug))
  const { data, error } = await db
    .from('showcase_players')
    .update({ payment_status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('event_id', (events ?? []).map((e) => e.id))
    .select('id, payment_status')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  return NextResponse.json(data)
}
