import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as dbCore from '../src/lib/admin-db-core.ts'
import * as shared from '../src/lib/selection-evaluation.ts'

const require = createRequire(import.meta.url)
const nextServer = require('next/server')

// Staff evaluations next to the tests (30.10.2026): the note checks, the Hamburg-shaped stored note, and the actual
// route handlers against a fake client. Nothing here can reach a database.

function loadSource(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, module: { exports }, URL,
    require(name) {
      if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`)
      return imports[name]
    },
  }, { filename: path })
  return exports
}
const note = loadSource('../src/lib/selection-evaluation-note.ts', { './selection-evaluation': shared })
const plain = (v) => JSON.parse(JSON.stringify(v))

const EVENT = '91cd147c-2937-40a6-b385-305ccbd68cf6'
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const OUTSIDER = '44444444-4444-4444-8444-444444444444'
const input = (patch = {}) => ({ ...shared.emptyEvaluation(), ...patch })
const request = (patch = {}) => ({ eventId: EVENT, playerId: P1, expectedVersion: 0, note: input(), ...patch })

// ITP-Staff-App src/lib/hamburg-showcase/server.ts (origin/main 8ed2e9b): the exact key set its parser accepts
const HAMBURG_NOTE_KEYS = ['attendance', 'jersey', 'group', 'observedPosition', 'ratings', 'positive', 'developmentPoint', 'rawVoice',
  'evidenceConfidence', 'nextEvidence', 'internalNextAction', 'manualOutcome', 'footageReviewed', 'observedAt',
  'footballCollegeFit', 'academicCurrentGrade', 'academicQualification', 'academicGraduationYear']

test('a save request: exact keys, enums, 1-5 ratings, capped text', () => {
  const ok = note.parseEvaluationRequest(request({ note: input({ observedPosition: '  ZM ', ratings: { technical: 4, athletic: null, tactical: 5, mentality: 3, overall: 4 }, manualOutcome: 'college_potential_development', footballCollegeFit: 'yes' }) }))
  assert.equal(ok.note.observedPosition, 'ZM', 'trimmed')
  assert.equal(ok.note.ratings.technical, 4)
  const bad = (patch, pattern) => assert.match(note.parseEvaluationRequest(patch).error ?? '', pattern, JSON.stringify(patch).slice(0, 120))
  bad({ ...request(), scoutName: 'Max' }, /Ungültige Anfrage/)
  bad(request({ note: { ...input(), scout_name: 'Max' } }), /Ungültige Bewertung/)
  bad(request({ note: { ...input(), attendance: 'present' } }), /Ungültige Bewertung/)
  for (const r of [0, 6, 2.5, '3']) bad(request({ note: input({ ratings: { ...input().ratings, overall: r } }) }), /1 bis 5/)
  bad(request({ note: input({ ratings: { technical: 3 } }) }), /1 bis 5/)
  bad(request({ note: input({ manualOutcome: 'signed' }) }), /Einschätzung/)
  bad(request({ note: input({ footballCollegeFit: 'maybe' }) }), /College-Fußball-Niveau/)
  bad(request({ note: input({ rawVoice: 'x'.repeat(1001) }) }), /höchstens 1000 Zeichen/)
  bad(request({ note: input({ observedPosition: 'x'.repeat(101) }) }), /höchstens 100 Zeichen/)
  bad(request({ note: input({ positive: 5 }) }), /Ungültige Bewertung/)
  bad(request({ expectedVersion: -1 }), /Version/)
  bad(request({ expectedVersion: 1.5 }), /Version/)
  bad(request({ playerId: 'jersey-only-a-9' }), /playerId/)
  assert.ok('note' in note.parseEvaluationRequest(request({ note: input({ rawVoice: 'x'.repeat(1000) }) })))
})

test('the stored note has Hamburg\'s full key set and valid Hamburg defaults', () => {
  const stored = note.toStoredNote(input({ manualOutcome: 'ready_for_recruiting_review', footballCollegeFit: 'no' }), '2026-10-30T16:05:00.000Z')
  assert.deepEqual(Object.keys(stored).sort(), [...HAMBURG_NOTE_KEYS].sort())
  assert.deepEqual(Object.keys(stored.ratings), ['technical', 'athletic', 'tactical', 'mentality', 'overall'])
  assert.equal(stored.attendance, '')
  assert.equal(stored.evidenceConfidence, 'brief')
  assert.equal(stored.nextEvidence, 'none')
  assert.equal(stored.internalNextAction, 'no_current_action')
  assert.equal(stored.footageReviewed, false)
  assert.equal(stored.manualOutcome, 'ready_for_recruiting_review')
  assert.deepEqual(plain(note.readStoredNote(stored)), { ...input({ manualOutcome: 'ready_for_recruiting_review', footballCollegeFit: 'no' }), observedAt: '2026-10-30T16:05:00.000Z' })
  assert.deepEqual(plain(note.readStoredNote('garbage')), { ...input(), observedAt: '' })
  assert.deepEqual(plain(note.readStoredNote({ ratings: { overall: 9 }, manualOutcome: 'x' })).ratings.overall, null)
})

test('writer name from the staff profile only; first observation time is kept', () => {
  assert.equal(note.scoutNameOf({ full_name: '  Testtrainer Eins ', email: 't1@example.test' }), 'Testtrainer Eins')
  assert.equal(note.scoutNameOf({ full_name: null, email: 't2@example.test' }), 't2@example.test')
  assert.equal(note.scoutNameOf({ full_name: ' ', email: null }), null)
  assert.equal(note.scoutNameOf(null), null)
  assert.equal(note.scoutNameOf({ full_name: 'x'.repeat(100), email: null }).length, 80)
  assert.equal(note.observedAtFor({ observedAt: '2026-10-30T16:05:00.000Z' }, '2026-10-30T17:00:00.000Z'), '2026-10-30T16:05:00.000Z')
  assert.equal(note.observedAtFor(null, '2026-10-30T17:00:00.000Z'), '2026-10-30T17:00:00.000Z')
})

// ---- the route, with a fake client ----

const fakeDb = ({ invariant = null, rpcError = false } = {}) => {
  const rows = [
    { event_id: EVENT, player_id: P2, scout_name: 'Testtrainer Zwei', note: note.toStoredNote(input({ positive: 'Schnell' }), '2026-10-30T15:00:00.000Z'), version: 3, updated_at: '2026-10-30T15:10:00.000Z' },
    { event_id: EVENT, player_id: OUTSIDER, scout_name: 'Testtrainer Zwei', note: {}, version: 1, updated_at: '2026-10-30T15:20:00.000Z' },
  ]
  const calls = []
  const rpcs = []
  let clock = 0
  const run = (q) => {
    calls.push(q)
    const eq = (col) => q.ops.find((o) => o[0] === 'eq' && o[1] === col)?.[2]
    const select = q.ops.find((o) => o[0] === 'select')?.[1]
    if (q.table === 'showcase_invites' && select === 'player_id') return { data: [{ player_id: P1 }, { player_id: P2 }], error: null }
    if (q.table === 'showcase_invites') return { data: [P1, P2].includes(eq('player_id')) && eq('event_id') === EVENT ? [{ id: 'i' }] : [], error: null }
    if (q.table === 'scouting_event_notes' && q.ops.some((o) => o[0] === 'maybeSingle')) {
      const row = rows.find((r) => r.event_id === eq('event_id') && r.player_id === eq('player_id') && r.scout_name === eq('scout_name'))
      return { data: row ? { note: row.note } : null, error: null }
    }
    if (q.table === 'scouting_event_notes') return { data: rows.filter((r) => r.event_id === eq('event_id')), error: null }
    throw new Error(`unexpected query on ${q.table}`)
  }
  // Same contract as itp.save_scouting_event_note: 0 creates, otherwise the version must match
  const rpc = (name, args) => {
    rpcs.push({ name, args })
    if (rpcError) return Promise.resolve({ data: null, error: { message: 'boom' } })
    const row = rows.find((r) => r.event_id === args.p_event_id && r.player_id === args.p_player_id && r.scout_name === args.p_scout_name)
    const out = (saved, r) => Promise.resolve({ data: [{ saved, conflict: !saved, version: r?.version ?? null, updated_at: r?.updated_at ?? null, invariant_error: null }], error: null })
    if (invariant) return Promise.resolve({ data: [{ saved: false, conflict: false, version: null, updated_at: null, invariant_error: invariant }], error: null })
    if ((args.p_expected_version === 0 && row) || (args.p_expected_version > 0 && (!row || row.version !== args.p_expected_version))) return out(false, row)
    const updated_at = `2026-10-30T16:0${++clock}:00.000Z`
    if (row) Object.assign(row, { note: args.p_note, version: row.version + 1, updated_at })
    else rows.push({ event_id: args.p_event_id, player_id: args.p_player_id, scout_name: args.p_scout_name, note: args.p_note, version: 1, updated_at })
    return out(true, rows.find((r) => r.event_id === args.p_event_id && r.player_id === args.p_player_id && r.scout_name === args.p_scout_name))
  }
  const client = {
    rpc,
    from(table) {
      const q = { table, ops: [] }
      const chain = new Proxy({}, {
        get: (_, prop) => (prop === 'then'
          ? (resolve, reject) => Promise.resolve().then(() => run(q)).then(resolve, reject)
          : (...args) => { q.ops.push([prop, ...args]); return chain }),
      })
      return chain
    },
  }
  return { client, calls, rpcs, rows }
}

const STAFF = { id: 's1', full_name: 'Testtrainer Eins', email: 't1@example.test', role: 'staff' }
const routeWith = (db) => loadSource('../src/app/api/admin/invites/evaluations/route.ts', {
  'next/server': nextServer,
  '@/lib/supabase-admin': { createAdminClient: () => db.client },
  // x-test-staff: a staff session; authorization: the basic-auth admin (no name); neither: refused
  '@/lib/staff-auth': {
    adminOrStaffAuth: async (req) => {
      if (req.headers.get('x-test-staff')) return { denied: null, staff: JSON.parse(req.headers.get('x-test-staff')) }
      if (req.headers.get('authorization') === 'basic') return { denied: null, staff: null }
      return { denied: nextServer.NextResponse.json({ error: 'Authentication required' }, { status: 401 }), staff: null }
    },
  },
  '@/lib/admin-db-core': dbCore,
  '@/lib/selection-evaluation-note': note,
})

const ORIGIN = 'https://coordinator.example'
const asStaff = (staff = STAFF) => ({ 'x-test-staff': JSON.stringify(staff) })
const get = (route, headers) => route.GET(new nextServer.NextRequest(`${ORIGIN}/api/admin/invites/evaluations?event_id=${EVENT}`, { headers }))
const post = (route, body, headers = asStaff()) => route.POST(new nextServer.NextRequest(`${ORIGIN}/api/admin/invites/evaluations`, {
  method: 'POST', body: JSON.stringify(body), headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers },
}))

test('GET: every note of the Kader with its writer, never one outside the Kader; the own name from the session', async () => {
  const route = routeWith(fakeDb())
  assert.equal((await get(route, {})).status, 401)
  const res = await get(route, asStaff())
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.scout, 'Testtrainer Eins')
  assert.deepEqual(body.entries.map((e) => [e.playerId, e.scout, e.version]), [[P2, 'Testtrainer Zwei', 3]])
  assert.equal(body.entries[0].note.positive, 'Schnell')
  assert.equal((await (await get(route, { authorization: 'basic' })).json()).scout, null, 'basic auth reads without a name')
})

test('POST: refused before any write without a staff name, cross-site, with a name in the body, bad values or outside the Kader', async () => {
  const db = fakeDb()
  const route = routeWith(db)
  let res = await post(route, request(), { authorization: 'basic' })
  assert.equal(res.status, 403)
  assert.match((await res.json()).error, /Staff-App-Login/)
  assert.equal((await post(route, request(), { ...asStaff(), origin: 'https://attacker.example' })).status, 403)
  assert.equal((await post(route, request(), asStaff({ ...STAFF, full_name: null, email: null }))).status, 403)
  assert.equal((await post(route, { ...request(), scoutName: 'Max' })).status, 400)
  assert.equal((await post(route, request({ note: input({ manualOutcome: 'signed' }) }))).status, 400)
  assert.equal(db.rpcs.length, 0)
  res = await post(route, request({ playerId: OUTSIDER }))
  assert.equal(res.status, 404)
  assert.equal(db.rpcs.length, 0, 'nothing saved for a player outside the Kader')
})

test('POST: saves under the session name with versions; a stale version is a 409 with a German explanation', async () => {
  const db = fakeDb()
  const route = routeWith(db)
  const first = await post(route, request({ note: input({ positive: 'Kopfball', ratings: { ...input().ratings, overall: 4 } }) }))
  assert.equal(first.status, 200)
  const saved = await first.json()
  assert.deepEqual([saved.scout, saved.version, saved.note.positive, saved.note.ratings.overall], ['Testtrainer Eins', 1, 'Kopfball', 4])
  const call = db.rpcs[0]
  assert.equal(call.name, 'save_scouting_event_note')
  assert.deepEqual([call.args.p_event_id, call.args.p_player_id, call.args.p_scout_name, call.args.p_expected_version], [EVENT, P1, 'Testtrainer Eins', 0])
  assert.deepEqual(Object.keys(call.args.p_note).sort(), [...HAMBURG_NOTE_KEYS].sort())

  const second = await post(route, request({ expectedVersion: 1, note: input({ positive: 'Kopfball, Zweikampf' }) }))
  assert.equal((await second.json()).version, 2)
  assert.equal(db.rpcs[1].args.p_note.observedAt, call.args.p_note.observedAt, 'first observation time kept')

  for (const expectedVersion of [1, 0]) {
    const stale = await post(route, request({ expectedVersion }))
    assert.equal(stale.status, 409)
    const body = await stale.json()
    assert.equal(body.error, 'version_conflict')
    assert.equal(body.currentVersion, 2)
    assert.match(body.message, /inzwischen woanders gespeichert/)
  }
  assert.equal(db.rows.find((r) => r.player_id === P1).note.positive, 'Kopfball, Zweikampf', 'the stale saves changed nothing')

  // A colleague's note on the same player is a separate row under the colleague's name
  await post(route, request(), asStaff({ ...STAFF, id: 's2', full_name: 'Testtrainer Drei' }))
  assert.deepEqual(db.rows.filter((r) => r.player_id === P1).map((r) => r.scout_name).sort(), ['Testtrainer Drei', 'Testtrainer Eins'])
})

test('POST: the function\'s refusals and failures come back as clear errors', async () => {
  let res = await post(routeWith(fakeDb({ invariant: 'ready_outcome_would_be_unsupported' })), request())
  assert.equal(res.status, 422)
  assert.equal((await res.json()).error, 'ready_outcome_would_be_unsupported')
  res = await post(routeWith(fakeDb({ rpcError: true })), request())
  assert.equal(res.status, 500)
  assert.match((await res.json()).error, /Speichern hat nicht geklappt/)
})
