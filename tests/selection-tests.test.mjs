import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as dbCore from '../src/lib/admin-db-core.ts'
import * as tests from '../src/lib/selection-tests.ts'
import * as sync from '../src/lib/score-sync.ts'

const require = createRequire(import.meta.url)
const nextServer = require('next/server')

// Pitch-side test entry (30.10.2026): the shared field list and limits, and the actual route handlers with a fake
// database client. Nothing here can reach a database.

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

const NEW_COLUMNS = ['sprint_5m', 'sprint_10m', 'sprint_20m', 'sprint_30m', 'sprint_40yd', 'agility'].flatMap((k) => [`${k}_1`, `${k}_2`])

test('the migration adds exactly the new columns; broad jump reuses broad_jump_1/2', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261029000001_selection_tests.sql', import.meta.url), 'utf8')
  const added = [...sql.matchAll(/^\s*add column if not exists ([a-z0-9_]+) numeric/gm)].map((m) => m[1])
  assert.deepEqual(added, NEW_COLUMNS)
  assert.match(sql, /^alter table itp\.showcase_players$/m)
  assert.deepEqual([...tests.TEST_FIELDS].sort(), [...NEW_COLUMNS, 'broad_jump_1', 'broad_jump_2'].sort())
  for (const line of sql.split('\n').filter((l) => /drop column/.test(l))) assert.match(line, /^--/, 'rollback stays commented')
})

test('typed values: comma or dot, empty clears, anything else is refused', () => {
  assert.deepEqual(tests.parseScoreText('4,52'), { value: 4.52 })
  assert.deepEqual(tests.parseScoreText(' 4.5 '), { value: 4.5 })
  assert.deepEqual(tests.parseScoreText(',98'), { value: 0.98 })
  assert.deepEqual(tests.parseScoreText('245'), { value: 245 })
  assert.deepEqual(tests.parseScoreText('  '), { value: null })
  for (const bad of ['abc', '4,5,2', '-1', '4 52', '1e2']) assert.ok('error' in tests.parseScoreText(bad), bad)
  assert.equal(tests.formatScore(4.52), '4,52')
  assert.equal(tests.formatScore(null), '')
  assert.equal(tests.formatScore(4.3199999999), '4,32')
  assert.equal(tests.formatScore(1.055), '1,055')
})

test('plausible ranges per test, with a German message', () => {
  const ok = (field, v) => assert.equal(tests.validateScore(field, v), null, `${field} ${v}`)
  const no = (field, v) => assert.match(tests.validateScore(field, v) ?? '', /bitte einen Wert zwischen/, `${field} ${v}`)
  ok('sprint_5m_1', 0.5); ok('sprint_5m_1', 1.05); ok('sprint_30m_2', 15); no('sprint_10m_1', 0.4); no('sprint_20m_2', 15.01)
  ok('sprint_40yd_1', 4.95); no('sprint_40yd_2', 10.5)
  ok('agility_1', 4.8); ok('agility_2', 17.3); no('agility_1', 31)
  ok('broad_jump_1', 245); no('broad_jump_2', 49); no('broad_jump_1', 401)
  ok('sprint_5m_1', null); no('sprint_5m_1', '1.05'); no('sprint_5m_1', Number.NaN)
  assert.equal(tests.validateScore('broad_jump_1', 20), 'Weitsprung: bitte einen Wert zwischen 50 und 400 cm eingeben')
  assert.equal(tests.validateScore('sprint_10m_1', 99), 'Sprint 10 m: bitte einen Wert zwischen 0,5 und 15 s eingeben')
})

test('save values: whitelist only, every value checked', () => {
  assert.deepEqual(tests.parseTestValues({ sprint_10m_1: 1.82, broad_jump_2: null }), { values: { sprint_10m_1: 1.82, broad_jump_2: null } })
  assert.match(tests.parseTestValues({ jersey_number: 7 }).error, /Unbekanntes Feld: jersey_number/)
  assert.match(tests.parseTestValues({ sprint_1: 4.5 }).error, /Unbekanntes Feld: sprint_1/, 'the legacy sprint stays out')
  assert.match(tests.parseTestValues({ sprint_10m_1: 1.8, name: 'x' }).error, /Unbekanntes Feld/)
  assert.ok('error' in tests.parseTestValues({}))
  assert.ok('error' in tests.parseTestValues(null))
  assert.ok('error' in tests.parseTestValues([1]))
  assert.ok('error' in tests.parseTestValues({ agility_1: 99 }))
})

test('best value: lowest time, longest jump, one attempt is enough', () => {
  const p = tests.toTestPlayer({ id: 'p', name: 'A', sprint_10m_1: 1.9, sprint_10m_2: 1.82, broad_jump_1: 230, broad_jump_2: 241, agility_2: 4.7 })
  assert.equal(tests.bestOf(p, 'sprint_10m'), 1.82)
  assert.equal(tests.bestOf(p, 'broad_jump'), 241)
  assert.equal(tests.bestOf(p, 'agility'), 4.7)
  assert.equal(tests.bestOf(p, 'sprint_5m'), null)
  assert.equal(tests.getBest(3, 2), 3)
  assert.equal(tests.getBest(3, 2, true), 2)
})

test('roster order: shirt numbers ascending, then the rest by name', () => {
  const rows = [{ name: 'Zora', jersey_number: null }, { name: 'Ben', jersey_number: 11 }, { name: 'Anna', jersey_number: null }, { name: 'Carl', jersey_number: 2 }]
  assert.deepEqual(tests.sortRoster(rows).map((r) => r.name), ['Carl', 'Ben', 'Anna', 'Zora'])
})

test('missing-column errors are recognised, other errors are not', () => {
  assert.equal(tests.isTestsMigrationPending('column showcase_players_1.sprint_5m_1 does not exist'), true)
  assert.equal(tests.isTestsMigrationPending("Could not find the 'agility_2' column of 'showcase_players' in the schema cache"), true)
  assert.equal(tests.isTestsMigrationPending('column showcase_players.sprint_1 does not exist'), false)
  assert.equal(tests.isTestsMigrationPending('permission denied for table showcase_players'), false)
  assert.equal(tests.isTestsMigrationPending(undefined), false)
})

test('saves of one field: only the latest answer counts, a quick second save expects the first one\'s value', () => {
  const s = sync.createScoreSync()
  const a = s.start('p1:sprint_10m_1', 1.8, 1.82)
  assert.equal(a.expected, 1.82, 'first save expects what is on screen')
  const b = s.start('p1:sprint_10m_1', 1.79, 1.82)
  assert.equal(b.expected, 1.8, 'the second expects the value in flight, not the older one on screen')
  const other = s.start('p1:agility_1', null, 2.4)
  assert.equal(other.expected, 2.4, 'other fields are independent')
  assert.equal(s.finish('p1:sprint_10m_1', b.seq), true, 'newer answer first: it counts')
  assert.equal(s.finish('p1:sprint_10m_1', a.seq), false, 'the older answer arriving late is dropped')
  assert.equal(s.finish('p1:agility_1', other.seq), true)
  const c = s.start('p1:sprint_10m_1', null, 1.79)
  assert.equal(c.expected, 1.79, 'nothing in flight any more: back to what is on screen')
  const d = s.start('p1:sprint_10m_1', 1.7, 1.79)
  assert.equal(d.expected, null, 'a clearing save in flight is expected as empty')
  assert.equal(s.finish('p1:sprint_10m_1', c.seq), false, 'older answer first: dropped')
  assert.equal(s.finish('p1:sprint_10m_1', d.seq), true)
})

test('after a save the field shows the server value only if nothing newer was typed and the field is left', () => {
  assert.equal(sync.adoptServerValue('1,80', '1,80', false), true)
  assert.equal(sync.adoptServerValue('1,80', '1,79', false), false, 'typed again while saving: keep the newer text')
  assert.equal(sync.adoptServerValue('1,80', '1,80', true), false, 'back in the field: keep what is there')
  assert.equal(sync.adoptServerValue('1,80', null, false), false)
})

test('expected values: exactly the changed fields, numbers or null', () => {
  assert.deepEqual(tests.parseExpected({ agility_1: 2.4 }, { agility_1: null }), { expected: { agility_1: null } })
  assert.deepEqual(tests.parseExpected({ agility_1: 2.4 }, { agility_1: 99 }), { expected: { agility_1: 99 } }, 'not range-checked')
  for (const bad of [null, [], {}, { agility_2: 1 }, { agility_1: 1, agility_2: 1 }, { agility_1: Number.NaN }, { agility_1: '2,4' }]) {
    assert.ok('error' in tests.parseExpected({ agility_1: 2.4 }, bad), JSON.stringify(bad))
  }
})

// ---- the route, with a fake client ----

const EVENT = '91cd147c-2937-40a6-b385-305ccbd68cf6'
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const P3 = '33333333-3333-4333-8333-333333333333'
const OUTSIDER = '44444444-4444-4444-8444-444444444444'

const fakeDb = ({ pending = false } = {}) => {
  const calls = []
  const players = {
    [P1]: { id: P1, name: 'Testspieler Eins', position: 'ZM', jersey_number: 10, broad_jump_1: 230, sprint_10m_1: 1.82 },
    [P2]: { id: P2, name: 'Testspieler Zwei', position: 'TW', jersey_number: null },
    [P3]: { id: P3, name: 'Testspieler Drei', position: null, jersey_number: 4 },
  }
  // Like PostgREST: only the selected columns come back
  const pick = (row, columns) => Object.fromEntries(columns.split(',').map((c) => c.trim()).map((c) => [c, row[c] ?? null]))
  const run = (q) => {
    calls.push(q)
    const op = (name) => q.ops.find((o) => o[0] === name)
    const eq = (col) => q.ops.find((o) => o[0] === 'eq' && o[1] === col)?.[2]
    const select = op('select')?.[1] ?? ''
    if (q.table === 'showcase_invites' && select.includes('player:showcase_players(')) {
      if (pending && select.includes('sprint_5m_1')) return { data: null, error: { message: 'column showcase_players_1.sprint_5m_1 does not exist' } }
      // P1 twice (two accepted invites for one sign-up) must still show once
      const columns = select.match(/showcase_players\(([^)]*)\)/)[1]
      return { data: [P1, P2, P3, P1].map((id) => ({ player_id: id, player: pick(players[id], columns) })), error: null }
    }
    if (q.table === 'showcase_invites') return { data: [P1, P2, P3].includes(eq('player_id')) ? [{ id: 'i' }] : [], error: null }
    if (q.table === 'showcase_players' && op('update')) {
      const values = op('update')[1]
      if (pending) {
        const missing = Object.keys(values).find((k) => NEW_COLUMNS.includes(k))
        return { data: null, error: { message: missing ? `Could not find the '${missing}' column of 'showcase_players' in the schema cache` : 'column showcase_players.sprint_5m_1 does not exist' } }
      }
      // Like PostgREST: the row changes only when every filter matches (eq on a value, is on null)
      const row = players[eq('id')]
      const matches = row && eq('event_id') === EVENT && q.ops.every((o) =>
        o[0] === 'is' ? (row[o[1]] ?? null) === null : o[0] !== 'eq' || ['id', 'event_id'].includes(o[1]) || row[o[1]] === o[2])
      if (!matches) return { data: null, error: null }
      Object.assign(row, values)
      return { data: pick(row, select), error: null }
    }
    if (q.table === 'showcase_players') return { data: players[eq('id')] ? pick(players[eq('id')], select) : null, error: null }
    throw new Error(`unexpected query on ${q.table}`)
  }
  const client = {
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
  return { client, calls, players }
}

const routeWith = (db) => {
  const inviteDb = loadSource('../src/lib/invite-db.ts', { 'next/server': nextServer })
  return loadSource('../src/app/api/admin/invites/tests/route.ts', {
    'next/server': nextServer,
    '@/lib/supabase-admin': { createAdminClient: () => db.client },
    '@/lib/staff-auth': {
      adminOrStaffAuth: async (req) => (req.headers.get('authorization') === 'ok'
        ? { denied: null, staff: null }
        : { denied: nextServer.NextResponse.json({ error: 'Authentication required' }, { status: 401 }), staff: null }),
    },
    '@/lib/invite-db': inviteDb,
    '@/lib/admin-db-core': dbCore,
    '@/lib/selection-tests': tests,
  })
}

const ORIGIN = 'https://coordinator.example'
const get = (route, query = `?event_id=${EVENT}`, headers = { authorization: 'ok' }) =>
  route.GET(new nextServer.NextRequest(`${ORIGIN}/api/admin/invites/tests${query}`, { headers }))
const patch = (route, body, headers = {}) =>
  route.PATCH(new nextServer.NextRequest(`${ORIGIN}/api/admin/invites/tests`, {
    method: 'PATCH', body: JSON.stringify(body),
    headers: { authorization: 'ok', origin: ORIGIN, 'content-type': 'application/json', ...headers },
  }))

test('GET: the Kader with every test field, sorted, one card per sign-up', async () => {
  const route = routeWith(fakeDb())
  assert.equal((await get(route, `?event_id=${EVENT}`, {})).status, 401)
  assert.equal((await get(route, '')).status, 400)
  const res = await get(route)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.migrationPending, false)
  assert.deepEqual(body.players.map((p) => p.name), ['Testspieler Drei', 'Testspieler Eins', 'Testspieler Zwei'])
  const one = body.players[1]
  assert.equal(one.sprint_10m_1, 1.82)
  assert.equal(one.broad_jump_1, 230)
  assert.equal(one.agility_2, null)
  assert.deepEqual(Object.keys(one).sort(), ['id', 'jersey_number', 'name', 'position', ...tests.TEST_FIELDS].sort())
})

test('GET before the migration: same roster, test values null, migrationPending', async () => {
  const db = fakeDb({ pending: true })
  const res = await get(routeWith(db))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.migrationPending, true)
  assert.equal(body.players.length, 3)
  assert.ok(body.players.every((p) => tests.TEST_FIELDS.every((f) => p[f] === null)))
  assert.equal(db.calls.length, 2, 'one retry without the test columns')
})

test('PATCH: refuses foreign columns, bad numbers, other events and cross-site calls before writing', async () => {
  const db = fakeDb()
  const route = routeWith(db)
  const base = { eventId: EVENT, playerId: P1 }
  const ok = { ...base, values: { sprint_10m_1: 1.8 }, expected: { sprint_10m_1: 1.82 } }
  assert.equal((await patch(route, ok, { origin: 'https://attacker.example' })).status, 403)
  assert.equal((await patch(route, ok, { authorization: '' })).status, 401)
  let res = await patch(route, { ...base, values: { jersey_number: 99 } })
  assert.equal(res.status, 400)
  assert.match((await res.json()).error, /Unbekanntes Feld/)
  res = await patch(route, { ...base, values: { sprint_30m_2: 45 } })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'Sprint 30 m: bitte einen Wert zwischen 0,5 und 15 s eingeben')
  assert.equal((await patch(route, { eventId: EVENT, values: { agility_1: 5 }, expected: { agility_1: null } })).status, 400)
  // the value last seen is required for every changed field, and only for those
  for (const expected of [undefined, {}, { agility_1: null, agility_2: null }, { agility_2: null }, { agility_1: '5' }]) {
    res = await patch(route, { ...base, values: { agility_1: 5 }, expected })
    assert.equal(res.status, 400, JSON.stringify(expected))
    assert.equal((await res.json()).error, 'Bisheriger Wert fehlt')
  }
  assert.equal(db.calls.length, 0, 'no query for a refused request')
  res = await patch(route, { eventId: EVENT, playerId: OUTSIDER, values: { agility_1: 5 }, expected: { agility_1: null } })
  assert.equal(res.status, 404)
  assert.ok(!db.calls.some((q) => q.ops.some((o) => o[0] === 'update')), 'nothing written for a player outside the Kader')
})

test('PATCH: writes only the given test fields of that player and returns the row', async () => {
  const db = fakeDb()
  const res = await patch(routeWith(db), { eventId: EVENT, playerId: P1, values: { sprint_10m_2: 1.79, broad_jump_1: null }, expected: { sprint_10m_2: null, broad_jump_1: 230 } })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.sprint_10m_2, 1.79)
  assert.equal(body.broad_jump_1, null)
  const update = db.calls.find((q) => q.table === 'showcase_players')
  const values = update.ops.find((o) => o[0] === 'update')[1]
  assert.deepEqual(Object.keys(values).sort(), ['broad_jump_1', 'sprint_10m_2', 'updated_at'])
  assert.deepEqual(update.ops.filter((o) => o[0] === 'eq' || o[0] === 'is').map((o) => o.slice(0, 3)),
    [['eq', 'id', P1], ['eq', 'event_id', EVENT], ['is', 'sprint_10m_2', null], ['eq', 'broad_jump_1', 230]], 'one update, guarded per field')
})

test('PATCH: a value changed by someone else in between is a 409 with the stored values, and nothing is written', async () => {
  const db = fakeDb()
  const route = routeWith(db)
  // Tester A saved 1.80 over the 1.82 both saw; tester B still sends 1.82 as the value seen
  assert.equal((await patch(route, { eventId: EVENT, playerId: P1, values: { sprint_10m_1: 1.8 }, expected: { sprint_10m_1: 1.82 } })).status, 200)
  const res = await patch(route, { eventId: EVENT, playerId: P1, values: { sprint_10m_1: 1.85 }, expected: { sprint_10m_1: 1.82 } })
  assert.equal(res.status, 409)
  const body = await res.json()
  assert.equal(body.error, 'value_conflict')
  assert.equal(body.current.sprint_10m_1, 1.8)
  assert.equal(body.current.broad_jump_1, 230)
  assert.equal(db.players[P1].sprint_10m_1, 1.8, 'B did not overwrite A')
  // B saves again against the value now shown: accepted
  assert.equal((await patch(route, { eventId: EVENT, playerId: P1, values: { sprint_10m_1: 1.85 }, expected: { sprint_10m_1: 1.8 } })).status, 200)
  // An empty field someone filled in between: same conflict
  await patch(route, { eventId: EVENT, playerId: P2, values: { agility_1: 2.4 }, expected: { agility_1: null } })
  assert.equal((await patch(route, { eventId: EVENT, playerId: P2, values: { agility_1: 2.5 }, expected: { agility_1: null } })).status, 409)
})

test('PATCH before the migration: a clear migration_pending answer, never a 500', async () => {
  for (const values of [{ sprint_5m_1: 1.05 }, { broad_jump_1: 240 }]) {
    const expected = Object.fromEntries(Object.keys(values).map((k) => [k, null]))
    const res = await patch(routeWith(fakeDb({ pending: true })), { eventId: EVENT, playerId: P1, values, expected })
    assert.equal(res.status, 503)
    const body = await res.json()
    assert.equal(body.error, 'migration_pending')
    assert.match(body.message, /20261029000001_selection_tests\.sql/)
  }
})
