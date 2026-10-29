import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { dbError } from '@/lib/invite-db'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { TEST_FIELDS, isTestsMigrationPending, parseTestValues, sortRoster, toTestPlayer } from '@/lib/selection-tests'

export const dynamic = 'force-dynamic'

// Pitch-side test scores for one event's Kader (accepted sign-ups): read all, save one player's fields.
// Admin basic auth or a Staff App login (middleware + here), like the other invite routes.

const PLAYER_COLUMNS = 'id, name, position, jersey_number'
const WITH_TESTS = `${PLAYER_COLUMNS}, ${TEST_FIELDS.join(', ')}`
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MIGRATION_PENDING = {
  error: 'migration_pending',
  message: 'Die Test-Felder fehlen noch in der Datenbank (Migration 20261029000001_selection_tests.sql). Speichern geht erst danach.',
}

// Same gate as /api/admin/db: a cross-site form could replay cached Basic credentials
const crossSite = (req: NextRequest) =>
  isSameOriginJsonRequest(req) ? null : NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })

const roster = (eventId: string, columns: string) =>
  createAdminClient()
    .from('showcase_invites')
    .select(`player_id, player:showcase_players(${columns})`)
    .eq('event_id', eventId)
    .eq('status', 'accepted')
    .not('player_id', 'is', null)

export async function GET(req: NextRequest) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId || !UUID.test(eventId)) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  // Before the migration the new columns are missing: the roster still loads, every test value reads null
  let migrationPending = false
  let { data, error } = await roster(eventId, WITH_TESTS)
  if (error && isTestsMigrationPending(error.message)) {
    migrationPending = true
    ;({ data, error } = await roster(eventId, PLAYER_COLUMNS))
  }
  if (error) return dbError(error.message)

  const rows = (data ?? []) as unknown as { player: Record<string, unknown> | null }[]
  const byId = new Map(rows.filter((r) => r.player).map((r) => [String(r.player!.id), toTestPlayer(r.player!)]))
  return NextResponse.json(
    { players: sortRoster([...byId.values()]), migrationPending },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function PATCH(req: NextRequest) {
  const { denied: authDenied } = await adminOrStaffAuth(req)
  const denied = authDenied ?? crossSite(req)
  if (denied) return denied
  const body = await req.json().catch(() => null)
  const eventId = body?.eventId
  const playerId = body?.playerId
  if (typeof eventId !== 'string' || !UUID.test(eventId) || typeof playerId !== 'string' || !UUID.test(playerId)) {
    return NextResponse.json({ error: 'eventId und playerId fehlen' }, { status: 400 })
  }
  // Only the whitelisted test columns, each validated; nothing else from the body reaches the update
  const parsed = parseTestValues(body?.values)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const db = createAdminClient()
  // Only a player of this event's Kader: an accepted invite of the event links to the sign-up
  const { data: links, error: linkError } = await db
    .from('showcase_invites')
    .select('id')
    .eq('event_id', eventId)
    .eq('player_id', playerId)
    .eq('status', 'accepted')
    .limit(1)
  if (linkError) return dbError(linkError.message)
  if (!links?.length) return NextResponse.json({ error: 'Spieler ist nicht im Kader dieses Events' }, { status: 404 })

  // One statement: before the migration the returned columns are missing, so it fails as a whole and writes nothing
  const { data, error } = await db
    .from('showcase_players')
    .update({ ...parsed.values, updated_at: new Date().toISOString() })
    .eq('id', playerId)
    .eq('event_id', eventId)
    .select(WITH_TESTS)
    .maybeSingle()
  if (error && isTestsMigrationPending(error.message)) return NextResponse.json(MIGRATION_PENDING, { status: 503 })
  if (error) return dbError(error.message)
  if (!data) return NextResponse.json({ error: 'Spieler nicht gefunden' }, { status: 404 })
  return NextResponse.json(toTestPlayer(data as unknown as Record<string, unknown>))
}
