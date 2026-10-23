import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { parseAcceptForm } from '@/lib/invite-accept'
import { sendRegistrationEmail } from '@/lib/registration-email'
import { germanTime, weekdayDate } from '@/lib/german-date'

export const dynamic = 'force-dynamic'

// Public: the player accepts (with the sign-up form and consent) or declines. Access = the token.

const clientIp = (req: NextRequest): string | null =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

interface EventRow {
  name: string
  slug: string
  start_date: string
  start_time: string | null
  location: string
  price: number | null
  currency: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json().catch(() => null)
  if (!body || (body.action !== 'accept' && body.action !== 'decline')) return fail('action must be accept or decline')

  const db = createAdminClient()
  const { data: invite, error } = await db
    .from('showcase_invites')
    .select('id, event_id, player_id, event:showcase_events(name, slug, start_date, start_time, location, price, currency)')
    .eq('token', token)
    .maybeSingle()
  if (error) return fail('Gerade nicht erreichbar. Bitte versuch es gleich noch einmal.', 503)
  if (!invite) return fail('not_found', 404)
  // The untyped client types a to-one join as an array; it is one row (FK on the invite)
  const event = invite.event as unknown as EventRow | null
  if (!event) return fail('not_found', 404)
  const now = new Date().toISOString()

  if (body.action === 'decline') {
    const { error: declineError } = await db
      .from('showcase_invites')
      .update({ status: 'declined', responded_at: now, updated_at: now })
      .eq('id', invite.id)
    if (declineError) return fail('Das hat nicht geklappt. Bitte versuch es noch einmal.', 500)
    return NextResponse.json({ ok: true, status: 'declined' })
  }

  const parsed = parseAcceptForm(body.form, new Date(event.start_date + 'T00:00:00').getFullYear())
  if (!parsed.ok) return fail(parsed.error)
  const d = parsed.data

  const playerRow = {
    event_id: invite.event_id,
    name: d.name,
    birth_year: d.birth_year,
    position: d.position,
    club: d.club,
    email: d.email,
    phone: d.phone,
    parent_name: d.parent_name,
    parent_phone: d.parent_phone,
    school_type: d.school_type,
    grad_year: d.grad_year,
    grades: d.grades,
    english_level: d.english_level,
    video_url: d.video_url,
    profile_url: d.profile_url,
    consent_profile_at: d.consent_profile ? now : null,
    consent_social_at: d.consent_social ? now : null,
    consent_parent_name: d.consent_name,
    consent_ip: clientIp(req),
    registered_at: now,
    updated_at: now,
  }

  // Until the profile_url migration is applied the column is missing; then the write is retried without it
  const withoutProfile = (row: typeof playerRow) => {
    const { profile_url: _dropped, ...rest } = row
    void _dropped
    return rest
  }
  const missingProfileColumn = (message: string | undefined) => !!message && /profile_url/.test(message)

  let playerId = invite.player_id
  if (playerId) {
    let { error: updateError } = await db.from('showcase_players').update(playerRow).eq('id', playerId)
    if (updateError && missingProfileColumn(updateError.message)) {
      ;({ error: updateError } = await db.from('showcase_players').update(withoutProfile(playerRow)).eq('id', playerId))
    }
    if (updateError) return fail('Das hat nicht geklappt. Bitte versuch es noch einmal.', 500)
  } else {
    const insertRow = { ...playerRow, payment_status: 'pending', created_by: 'invite' }
    let { data: created, error: insertError } = await db.from('showcase_players').insert([insertRow]).select('id').single()
    if (insertError && missingProfileColumn(insertError.message)) {
      ;({ data: created, error: insertError } = await db.from('showcase_players').insert([withoutProfile(insertRow)]).select('id').single())
    }
    if (insertError || !created) return fail('Das hat nicht geklappt. Bitte versuch es noch einmal.', 500)
    playerId = created.id
  }

  const { error: acceptError } = await db
    .from('showcase_invites')
    .update({ status: 'accepted', responded_at: now, player_id: playerId, updated_at: now })
    .eq('id', invite.id)
  if (acceptError) return fail('Das hat nicht geklappt. Bitte versuch es noch einmal.', 500)

  // Existing confirmation email, only when the player gave an email (phone is the primary contact)
  if (d.email) {
    const sent = await sendRegistrationEmail({
      eventSlug: event.slug,
      playerName: d.name,
      playerEmail: d.email,
      eventName: event.name,
      eventDate: weekdayDate(event.start_date),
      eventLocation: event.location,
      eventTime: germanTime(event.start_time),
      price: event.price,
      currency: event.currency,
    })
    if (sent.ok) await db.from('showcase_players').update({ confirmation_sent_at: now }).eq('id', playerId)
  }

  return NextResponse.json({ ok: true, status: 'accepted' })
}
