import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { observedAtFor, parseEvaluationRequest, readStoredNote, scoutNameOf, toStoredNote } from '@/lib/selection-evaluation-note'
import type { EvaluationEntry } from '@/lib/selection-evaluation'

export const dynamic = 'force-dynamic'

// Staff evaluations of the Kader of one event, stored like the Hamburg showcase notes: itp.scouting_event_notes
// (event_id = the Coordinator event id, player_id = the showcase_players id, scout_name = the writer). The table is
// read-only for the service role; writes go through itp.save_scouting_event_note, which checks the version.
// Everyone in the invite area reads all notes; only a Staff App login writes, and only under its own name.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NO_STORE = { 'Cache-Control': 'no-store' }

// Same gate as /api/admin/db: a cross-site form could replay cached Basic credentials
const crossSite = (req: NextRequest) =>
  isSameOriginJsonRequest(req) ? null : NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })

const unavailable = () =>
  NextResponse.json({ error: 'Bewertungen sind gerade nicht erreichbar. Bitte gleich nochmal versuchen.' }, { status: 503 })

export async function GET(req: NextRequest) {
  const { denied, staff } = await adminOrStaffAuth(req)
  if (denied) return denied
  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId || !UUID.test(eventId)) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const db = createAdminClient()
  const [roster, notes] = await Promise.all([
    db.from('showcase_invites').select('player_id').eq('event_id', eventId).eq('status', 'accepted').not('player_id', 'is', null),
    db.from('scouting_event_notes').select('player_id, scout_name, note, version, updated_at').eq('event_id', eventId).order('updated_at', { ascending: false }),
  ])
  if (roster.error || notes.error) return unavailable()

  // Only notes about players of this event's Kader
  const kader = new Set((roster.data ?? []).map((r) => String(r.player_id)))
  const entries: EvaluationEntry[] = (notes.data ?? [])
    .filter((r) => kader.has(String(r.player_id)))
    .map((r) => ({
      playerId: String(r.player_id),
      scout: String(r.scout_name),
      note: readStoredNote(r.note),
      version: Number(r.version),
      updatedAt: String(r.updated_at),
    }))
  return NextResponse.json({ scout: scoutNameOf(staff), entries }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const { denied: authDenied, staff } = await adminOrStaffAuth(req)
  const denied = authDenied ?? crossSite(req)
  if (denied) return denied
  const scout = scoutNameOf(staff)
  if (!scout) {
    return NextResponse.json({ error: 'Eigene Bewertungen gehen nur mit dem Staff-App-Login (der Name kommt aus dem Profil).' }, { status: 403 })
  }
  const parsed = parseEvaluationRequest(await req.json().catch(() => null))
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { eventId, playerId, expectedVersion, note } = parsed

  const db = createAdminClient()
  // Only a player of this event's Kader: an accepted invite of the event links to the sign-up
  const [link, own] = await Promise.all([
    db.from('showcase_invites').select('id').eq('event_id', eventId).eq('player_id', playerId).eq('status', 'accepted').limit(1),
    db.from('scouting_event_notes').select('note').eq('event_id', eventId).eq('player_id', playerId).eq('scout_name', scout).maybeSingle(),
  ])
  if (link.error || own.error) return unavailable()
  if (!link.data?.length) return NextResponse.json({ error: 'Spieler ist nicht im Kader dieses Events' }, { status: 404 })

  const stored = toStoredNote(note, observedAtFor(own.data?.note, new Date().toISOString()))
  const { data, error } = await db.rpc('save_scouting_event_note', {
    p_event_id: eventId,
    p_player_id: playerId,
    p_scout_name: scout,
    p_note: stored,
    p_expected_version: expectedVersion,
  })
  if (error) return NextResponse.json({ error: 'Speichern hat nicht geklappt. Bitte nochmal versuchen.' }, { status: 500 })
  const result = (Array.isArray(data) ? data[0] : data) as
    { saved?: boolean; version?: number | null; updated_at?: string | null; invariant_error?: string | null } | null
  if (result?.invariant_error) return NextResponse.json({ error: result.invariant_error }, { status: 422 })
  if (!result?.saved) {
    return NextResponse.json({
      error: 'version_conflict',
      message: 'Deine Bewertung wurde inzwischen woanders gespeichert (z. B. auf einem anderen Gerät). Der aktuelle Stand ist neu geladen, bitte prüfen und nochmal speichern.',
      currentVersion: result?.version ?? null,
    }, { status: 409 })
  }
  const entry: EvaluationEntry = {
    playerId, scout, note: readStoredNote(stored), version: Number(result.version), updatedAt: String(result.updated_at),
  }
  return NextResponse.json(entry)
}
