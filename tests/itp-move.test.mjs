import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { resolveItpTarget, itpMoveProbe, ItpTargetUnusableError } from '../src/lib/itp-target.ts'
import {
  SHOWCASE_DB_TABLES,
  TABLE_ACTIONS,
  DbRequestError,
  isSameOriginJsonRequest,
  createDbProxy,
  parseDbRequest,
  runDbRequest,
} from '../src/lib/admin-db-core.ts'

const today = 'https://umblyhwumtadlvgccdwg.supabase.co'
const core = 'https://wwomwawpxmkrykybpqok.supabase.co'
const key = 'test-key-do-not-return'
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// ---------- resolver: TODAY / SWITCHED / UNUSABLE ----------

test('TODAY: unset or blank schema keeps URL, key and client options exactly', () => {
  // Today's Production URL ends in a newline (seen in the live bundle 2026-10-19): it passes unchanged.
  for (const [url, schema] of [[today, undefined], [today, ''], [today, ' \t '], [`${today}\n`, undefined], [`${today}/`, undefined]]) {
    const target = resolveItpTarget(url, key, schema)
    assert.equal(target.schema, 'public')
    assert.equal(target.origin, today)
    assert.deepEqual([target.url, target.key, ...target.clientOptions], [url, key])
    // The factories spread clientOptions[0]: undefined adds nothing to today's options object.
    assert.deepEqual({ auth: { storageKey: 'showcase-coordinator-auth' }, ...target.clientOptions[0] },
      { auth: { storageKey: 'showcase-coordinator-auth' } })
  }
})

test('SWITCHED: Core plus itp selects the itp schema', () => {
  const target = resolveItpTarget(core, key, ' itp ')
  assert.equal(target.schema, 'itp')
  assert.deepEqual([target.url, target.key, ...target.clientOptions], [core, key, { db: { schema: 'itp' } }])
})

test('UNUSABLE: every bad mix refuses before any client or request exists', () => {
  const unusable = [
    [core, undefined], [core, ''], [today, 'itp'], [today, 'public'], [core, 'ITP'],
    [core.replace('https:', 'http:'), 'itp'], [core + '.evil.example', 'itp'], ['not a URL', 'itp'], [undefined, undefined],
    // Only the two canonical endpoints: no other host, no http, no credentials, path, query, fragment or port.
    ['https://evil.example', undefined], ['https://elsewhere.supabase.co', ''], [today.replace('https:', 'http:'), undefined],
    [core.replace('https://', 'https://user:pw@'), 'itp'], [today.replace('https://', 'https://user@'), undefined],
    [`${core}/rest/v1`, 'itp'], [`${core}?x=1`, 'itp'], [`${core}#f`, 'itp'], [`${today}:8443`, undefined],
  ]
  for (const [url, schema] of unusable) {
    assert.throws(() => resolveItpTarget(url, key, schema), ItpTargetUnusableError, `${url} ${schema}`)
  }
  for (const [url, schema] of [[core, 'itp'], [today, undefined]]) {
    for (const badKey of [undefined, '', ' ', '\n']) {
      assert.throws(() => resolveItpTarget(url, badKey, schema), ItpTargetUnusableError, JSON.stringify(badKey))
    }
  }
})

test('probe: no token = no I/O and no key; token = one move_phase read with the itp profile', async () => {
  let calls = 0
  const open = await (await itpMoveProbe({ url: core, key, schema: 'itp', fetch: async () => { calls++ } })).json()
  assert.equal(calls, 0)
  assert.equal(open.error, 'token_required')
  assert.equal(open.ref, 'wwomwawpxmkrykybpqok')
  assert.ok(!JSON.stringify(open).includes(key))

  const seen = []
  const fetch = async (url, init) => {
    seen.push({ url, profile: init.headers['Content-Profile'] })
    return new Response(JSON.stringify({ phase: 'open' }), { status: 200 })
  }
  const body = await (await itpMoveProbe({ authorized: true, url: core, key, schema: 'itp', fetch })).json()
  assert.deepEqual(seen, [{ url: `${core}/rest/v1/rpc/move_phase`, profile: 'itp' }])
  assert.equal(body.phase, 'open')
  assert.equal(body.schema, 'itp')
  assert.ok(!JSON.stringify(body).includes(key))
})

test('probe: every failed read says why, without echoing anything', async () => {
  const probe = async (fetch, url = core, schema = 'itp') =>
    (await (await itpMoveProbe({ authorized: true, url, key, schema, fetch })).json())
  const urls = []
  const missing = await probe(async (u) => { urls.push(u); return new Response('{"code":"PGRST202","message":"x"}', { status: 404 }) }, `${today}\n`, '')
  assert.deepEqual(urls, [`${today}/rest/v1/rpc/move_phase`], 'parsed origin, not the raw env string')
  assert.equal(missing.error, 'PGRST202')
  assert.equal((await probe(async () => new Response('<html>bad gateway', { status: 502 }))).error, 'http_502')
  assert.equal((await probe(async () => new Response('{}', { status: 200 }))).error, 'no_phase')
  assert.equal((await probe(async () => { throw new TypeError('fetch failed') })).error, 'request_failed')
  const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' })
  assert.equal((await probe(async () => { throw timeout })).error, 'timeout')
  assert.equal((await probe(async () => { throw new Error('never called') }, 'https://evil.example', '')).error, 'target_unusable')
})

test('probe route: exact public path, token compared by digest, service key + schema env', () => {
  const route = read('src/app/api/itp-move-probe/route.ts')
  assert.match(route, /timingSafeEqual\(/)
  assert.match(route, /key: process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(route, /schema: process\.env\.NEXT_PUBLIC_SUPABASE_DB_SCHEMA/)
  const mw = read('src/middleware.ts')
  assert.match(mw, /pathname === '\/api\/itp-move-probe' \|\|/)
  assert.ok(!/\/api\/admin/.test(mw), 'no admin path is public')
})

// ---------- /api/admin/db request rules ----------

test('db HTTP gate refuses cross-site forms before their valid JSON reaches the parser', async () => {
  // A text/plain HTML form can add its '=' separator inside an ignored JSON field.
  const form = '{"table":"showcase_tasks","action":"delete","filters":[{"op":"eq","column":"id","value":"fixture"}],"padding":"' + '=' + '"}\r\n'
  const attack = new Request('https://coordinator.example/api/admin/db', {
    method: 'POST',
    headers: { origin: 'https://attacker.example', 'content-type': 'text/plain' },
    body: form,
  })
  assert.equal(parseDbRequest(await attack.clone().json()).action, 'delete', 'the parser alone would accept the form')
  assert.equal(isSameOriginJsonRequest(attack), false)

  for (const [origin, contentType] of [
    [null, 'application/json'], ['null', 'application/json'],
    ['https://attacker.example', 'application/json'],
    ['https://coordinator.example.evil', 'application/json'],
    ['https://coordinator.example', 'text/plain'],
    ['https://coordinator.example', 'application/json-other'],
  ]) {
    const headers = new Headers({ 'content-type': contentType })
    if (origin !== null) headers.set('origin', origin)
    assert.equal(isSameOriginJsonRequest(new Request(attack.url, { method: 'POST', headers, body: '{}' })), false)
  }
  assert.equal(isSameOriginJsonRequest(new Request(attack.url, {
    method: 'POST', headers: { origin: 'https://coordinator.example', 'content-type': 'application/json; charset=utf-8' }, body: '{}',
  })), true)
})

const ok = (body) => parseDbRequest(body)
const refused = (body) => assert.throws(() => parseDbRequest(body), DbRequestError, JSON.stringify(body)?.slice(0, 200))

test('db route accepts the shapes the screens use', () => {
  ok({ table: 'showcase_tasks', action: 'select', columns: '*, showcase_categories(*)', filters: [{ op: 'eq', column: 'event_id', value: 'e1' }], order: [{ column: 'created_at', ascending: false }] })
  ok({ table: 'showcase_attendees', action: 'select', columns: '*', filters: [{ op: 'contains', column: 'roles', value: ['staff'] }, { op: 'ilike', column: 'name', value: '%an%' }] })
  ok({ table: 'showcase_tasks', action: 'select', columns: 'title, description, category_id, priority', filters: [] })
  ok({ table: 'showcase_events', action: 'insert', values: [{ name: 'x', type: 'showcase' }], columns: '*', single: true })
  ok({ table: 'showcase_day_groups', action: 'insert', values: [{ name: 'A' }, { name: 'B' }], columns: null })
  ok({ table: 'showcase_tasks', action: 'update', values: { status: 'done' }, filters: [{ op: 'eq', column: 'id', value: 't1' }], columns: '*, showcase_categories(*)', single: true })
  ok({ table: 'showcase_day_groups', action: 'delete', filters: [{ op: 'eq', column: 'event_id', value: 'e1' }] })
})

test('db route refuses other tables, actions, filters, columns and unscoped changes', () => {
  for (const table of ['showcase_players', 'scouts', 'users', 'showcase_schedule', 'Showcase_tasks', '']) {
    refused({ table, action: 'select', columns: '*' })
  }
  refused({ table: 'showcase_tasks', action: 'upsert', values: {} })
  refused({ table: 'showcase_tasks', action: 'rpc' })
  refused({ table: 'showcase_tasks', action: 'select', columns: '*', filters: [{ op: 'or', column: 'id', value: 'x' }] })
  refused({ table: 'showcase_tasks', action: 'select', columns: '*', filters: [{ op: 'eq', column: 'id;drop', value: 'x' }] })
  refused({ table: 'showcase_tasks', action: 'select', columns: '*', filters: [{ op: 'eq', column: 'id', value: { a: 1 } }] })
  refused({ table: 'showcase_tasks', action: 'select', columns: '*, showcase_players(*)' })
  refused({ table: 'showcase_tasks', action: 'select', columns: '*, users(*)' })
  refused({ table: 'showcase_tasks', action: 'select', columns: 'id::text' })
  refused({ table: 'showcase_tasks', action: 'select', columns: null })
  refused({ table: 'showcase_tasks', action: 'update', values: { status: 'x' } })
  refused({ table: 'showcase_tasks', action: 'update', values: { status: 'x' }, filters: [{ op: 'ilike', column: 'title', value: '%' }] })
  refused({ table: 'showcase_tasks', action: 'delete' })
  refused({ table: 'showcase_tasks', action: 'delete', filters: [{ op: 'contains', column: 'tags', value: [] }] })
  refused({ table: 'showcase_tasks', action: 'insert', values: [] })
  refused({ table: 'showcase_tasks', action: 'insert', values: Array.from({ length: 1001 }, () => ({ a: 1 })) })
  refused({ table: 'showcase_tasks', action: 'insert', values: { 'bad key': 1 } })
  refused({ table: 'showcase_tasks', action: 'insert', values: { a: 1 }, filters: [{ op: 'eq', column: 'id', value: 'x' }] })
  refused({ table: 'showcase_tasks', action: 'delete', values: { a: 1 }, filters: [{ op: 'eq', column: 'id', value: 'x' }] })
  refused({ table: 'showcase_tasks', action: 'update', values: { a: 1 }, filters: [{ op: 'eq', column: 'id', value: 'x' }], order: [{ column: 'id', ascending: true }] })
  refused({ table: 'showcase_tasks', action: 'delete', filters: [{ op: 'eq', column: 'id', value: 'x' }], single: true })
  refused(null)
  refused([])
})

test('db route: each table allows only what the screens do, and a change names its row by id', () => {
  const byId = [{ op: 'eq', column: 'id', value: 'r1' }]
  // Read-only categories, append-only activity log, materials, comments, milestones, feedback.
  for (const action of ['insert', 'update', 'delete']) refused({ table: 'showcase_categories', action, values: action === 'delete' ? null : { name: 'x' }, filters: action === 'insert' ? [] : byId })
  for (const action of ['select', 'update', 'delete']) refused({ table: 'showcase_activity', action, columns: '*', values: action === 'update' ? { actor: 'x' } : null, filters: action === 'select' ? [] : byId })
  refused({ table: 'showcase_materials', action: 'delete', filters: byId })
  refused({ table: 'showcase_comments', action: 'update', values: { content: 'x' }, filters: byId })
  refused({ table: 'showcase_milestones', action: 'delete', filters: byId })
  refused({ table: 'showcase_milestones', action: 'insert', values: { title: 'x' } })
  refused({ table: 'showcase_feedback', action: 'delete', filters: byId })
  refused({ table: 'showcase_day_groups', action: 'update', values: { name: 'x' }, filters: byId })
  // No mass change through a non-id filter (e.g. every open event), no id rewrite, no non-string id.
  refused({ table: 'showcase_events', action: 'delete', filters: [{ op: 'eq', column: 'registration_open', value: true }] })
  refused({ table: 'showcase_tasks', action: 'update', values: { status: 'x' }, filters: [{ op: 'eq', column: 'event_id', value: 'e1' }] })
  refused({ table: 'showcase_tasks', action: 'delete', filters: [{ op: 'eq', column: 'event_id', value: 'e1' }] })
  refused({ table: 'showcase_tasks', action: 'delete', filters: [{ op: 'eq', column: 'id', value: true }] })
  refused({ table: 'showcase_tasks', action: 'delete', filters: [{ op: 'eq', column: 'id', value: '' }] })
  refused({ table: 'showcase_tasks', action: 'update', values: { id: 'other' }, filters: byId })
  // The cloning exception is exactly one event-scoped day-group delete.
  refused({ table: 'showcase_day_groups', action: 'delete', filters: [{ op: 'eq', column: 'event_id', value: 'e1' }, { op: 'ilike', column: 'name', value: '%' }] })
  refused({ table: 'showcase_day_groups', action: 'delete', filters: [{ op: 'eq', column: 'sort_order', value: 1 }] })
  refused({ table: 'showcase_matches', action: 'delete', filters: [{ op: 'eq', column: 'event_id', value: 'e1' }] })
  // Embeds only of tables the screens may read.
  refused({ table: 'showcase_tasks', action: 'select', columns: '*, showcase_activity(*)' })
  ok({ table: 'showcase_activity', action: 'insert', values: { action: 'created' }, columns: null })
  ok({ table: 'showcase_events', action: 'delete', filters: byId })
  ok({ table: 'showcase_milestones', action: 'update', values: { completed: true }, filters: byId })
})

test('db route: basic auth checked first, then the parser; service client only', () => {
  const route = read('src/app/api/admin/db/route.ts')
  const auth = route.indexOf('adminAuthError(req)')
  assert.ok(auth > 0 && auth < route.indexOf('parseDbRequest('), 'auth before parse')
  assert.ok(route.indexOf('isSameOriginJsonRequest(req)') > auth, 'auth before origin check')
  assert.ok(route.indexOf('isSameOriginJsonRequest(req)') < route.indexOf('await req.json()'), 'origin check before body parsing')
  assert.ok(route.indexOf('parseDbRequest(') < route.indexOf('createAdminClient()'), 'parse before any client')
  assert.ok(!/export async function (GET|PUT|PATCH|DELETE)/.test(route), 'POST only')
})

// ---------- browser proxy -> request -> server replay ----------

function recorder() {
  const calls = []
  const chain = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') return (resolve) => resolve({ data: [{ id: 1 }], error: null })
      return (...args) => { calls.push([prop, ...args]); return chain }
    },
  })
  return { calls, client: { from: (t) => { calls.push(['from', t]); return chain } } }
}

test('proxy chain round-trips through the parser into the same supabase-js calls', async () => {
  const sent = []
  const db = createDbProxy(async (req) => { sent.push(req); return { data: 'ok', error: null } }, 'STORAGE')
  assert.equal(db.storage, 'STORAGE')

  const res = await db.from('showcase_tasks').update({ status: 'done' }).eq('id', 't1').select('*, showcase_categories(*)').single()
  assert.deepEqual(res, { data: 'ok', error: null })
  await Promise.all([
    db.from('showcase_day_activities').select('*, showcase_day_groups(*)').eq('event_id', 'e').eq('event_date', 'd').order('start_time').order('sort_order'),
    db.from('showcase_attendees').select('*').eq('event_id', 'e').order('name').contains('roles', ['staff']).ilike('name', '%a%'),
    db.from('showcase_events').insert([{ name: 'n' }]).select().single(),
    db.from('showcase_day_groups').delete().eq('event_id', 'e'),
  ])
  assert.equal(sent.length, 5)

  const { calls, client } = recorder()
  for (const req of sent) await runDbRequest(client, parseDbRequest(JSON.parse(JSON.stringify(req))))
  assert.deepEqual(calls, [
    ['from', 'showcase_tasks'], ['update', { status: 'done' }], ['eq', 'id', 't1'], ['select', '*, showcase_categories(*)'], ['single'],
    ['from', 'showcase_day_activities'], ['select', '*, showcase_day_groups(*)'], ['eq', 'event_id', 'e'], ['eq', 'event_date', 'd'],
    ['order', 'start_time', { ascending: true }], ['order', 'sort_order', { ascending: true }],
    ['from', 'showcase_attendees'], ['select', '*'], ['eq', 'event_id', 'e'], ['contains', 'roles', ['staff']], ['ilike', 'name', '%a%'],
    ['order', 'name', { ascending: true }],
    ['from', 'showcase_events'], ['insert', [{ name: 'n' }]], ['select', '*'], ['single'],
    ['from', 'showcase_day_groups'], ['delete'], ['eq', 'event_id', 'e'],
  ])
})

test('proxy sends once per awaited chain and turns a failed send into an error result', async () => {
  let n = 0
  const db = createDbProxy(async () => { n++; throw new Error('offline') }, null)
  const q = db.from('showcase_tasks').select('*').eq('event_id', 'e')
  const a = await q
  await q
  assert.equal(n, 1)
  assert.deepEqual(a, { data: null, error: { message: 'offline' } })
})

test('server replay passes PostgREST errors through without extra fields', async () => {
  const chain = new Proxy({}, {
    get: (_, p) => p === 'then'
      ? (resolve) => resolve({ data: null, error: { message: 'm', code: 'PGRST116', details: 'd', hint: null, extra: 'x' } })
      : () => chain,
  })
  const res = await runDbRequest({ from: () => chain }, parseDbRequest({ table: 'showcase_tasks', action: 'select', columns: '*', single: true }))
  assert.deepEqual(res, { data: null, error: { message: 'm', code: 'PGRST116', details: 'd' } })
})

// ---------- census: every call site matches what the route and Core allow ----------

const ADMIN_FILES = [
  'src/app/announcements/page.tsx', 'src/app/feedback/page.tsx', 'src/app/settings/page.tsx', 'src/app/tasks/[id]/page.tsx',
  'src/components/dashboard/milestones.tsx', 'src/components/events/create-event-dialog.tsx',
  'src/components/feedback/feedback-modal.tsx', 'src/components/schedule/staff-timeline.tsx',
  'src/components/tasks/task-comments.tsx', 'src/components/venue/venue-map.tsx',
  'src/hooks/use-attendees.ts', 'src/hooks/use-categories.ts', 'src/hooks/use-events.ts', 'src/hooks/use-tasks.ts',
]
// Public-path files keep the direct client: on Core only these stay open to the public key.
const PUBLIC_FILES = {
  'src/app/event/[slug]/page.tsx': ['showcase_events', 'showcase_event_scouts', 'scouts', 'showcase_players'],
  'src/app/event/[slug]/layout.tsx': ['showcase_events'],
  'src/app/event/[slug]/opengraph-image.tsx': ['showcase_events'],
  'src/contexts/event-context.tsx': ['showcase_events'],
}
const PROXY_METHODS = new Set(['from', 'select', 'insert', 'update', 'delete', 'eq', 'contains', 'ilike', 'order', 'single', 'storage'])
const tableOf = (text) => text.match(/^supabase\s*\.\s*from\(\s*'([a-z_]+)'\s*\)/)?.[1]

// Follows each `supabase.x(...).y(...)` chain (balanced parentheses, whitespace and newlines allowed).
// With another word it follows the chains continued on a local variable (`query = query.ilike(...)`).
function chains(src, word = 'supabase') {
  const out = []
  for (const m of src.matchAll(new RegExp(`\\b${word}\\b`, 'g'))) {
    let i = m.index + m[0].length
    const names = []
    for (;;) {
      const step = src.slice(i).match(/^\s*\.\s*([A-Za-z_]\w*)/)
      if (!step) break
      names.push(step[1])
      i += step[0].length
      const open = src.slice(i).match(/^\s*\(/)
      if (!open) continue
      i += open[0].length
      let depth = 1
      let quote = null
      for (; i < src.length && depth > 0; i++) {
        const c = src[i]
        if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue }
        if (c === "'" || c === '"' || c === '`') quote = c
        else if (c === '(') depth++
        else if (c === ')') depth--
      }
    }
    if (names.length) out.push({ names, text: src.slice(m.index, i) })
  }
  return out
}

test('census: the 14 coordinator files use only the proxy methods and listed tables', () => {
  let count = 0
  let variables = 0
  const used = new Set()
  for (const file of ADMIN_FILES) {
    const src = read(file)
    assert.match(src, /^import \{ adminDb as supabase \} from '@\/lib\/admin-db'$/m, file)
    assert.ok(!src.includes("from '@/lib/supabase'"), `${file} must not import the direct client`)
    for (const { names, text } of chains(src)) {
      count++
      if (names[0] === 'storage') {
        // Storage is not proxied: it stays on the direct client in both modes.
        assert.equal(file, 'src/components/feedback/feedback-modal.tsx')
        continue
      }
      for (const name of names) assert.ok(PROXY_METHODS.has(name), `${file}: unsupported .${name} in ${text.slice(0, 80)}`)
      assert.equal(names[0], 'from', `${file}: ${text.slice(0, 80)}`)
      const table = tableOf(text)
      assert.ok(SHOWCASE_DB_TABLES.includes(table), `${file}: table ${table} not on the db route list`)
      for (const sel of text.matchAll(/select\(\s*'([^']*)'/g)) {
        for (const t of sel[1].matchAll(/([a-z_]+)\(\*\)/g)) assert.ok(TABLE_ACTIONS[t[1]]?.includes('select'), `${file}: embed ${t[1]}`)
      }
      // The per-table rules must fit every screen call: allowed action, changes by id (or the clone clear).
      const action = names.find((n) => ['insert', 'update', 'delete'].includes(n)) ?? 'select'
      used.add(`${table}.${action}`)
      assert.ok(TABLE_ACTIONS[table].includes(action), `${file}: ${action} on ${table} is refused by the route`)
      if (action === 'update' || action === 'delete') {
        const clone = table === 'showcase_day_groups' && action === 'delete' && /\.eq\(\s*'event_id'/.test(text) && names.filter((n) => n === 'eq').length === 1
        assert.ok(/\.eq\(\s*'id'/.test(text) || clone, `${file}: ${action} on ${table} without an id`)
      }
    }
    // Chains continued on a local variable use only proxy methods too.
    for (const v of src.matchAll(/\b(?:let|const|var)\s+(\w+)\s*=\s*supabase\b/g)) {
      variables++
      for (const { names, text } of chains(src, v[1])) {
        for (const name of names) assert.ok(PROXY_METHODS.has(name), `${file}: unsupported .${name} in ${text.slice(0, 80)}`)
      }
    }
  }
  assert.ok(count >= 50, `found ${count} chains`)
  assert.equal(variables, 2, 'use-attendees and use-tasks build their list query on a variable')
  // And the rules are no wider than the screens: every allowed action is one a screen uses.
  assert.deepEqual([...used].sort(), Object.entries(TABLE_ACTIONS).flatMap(([t, as]) => as.map((a) => `${t}.${a}`)).sort())
})

test('census: every listed table is used, and the public files touch only public-on-Core objects', () => {
  const used = new Set()
  for (const file of ADMIN_FILES) for (const t of read(file).matchAll(/\.from\(\s*'(showcase_[a-z_]+)'\s*\)/g)) used.add(t[1])
  assert.deepEqual([...used].sort(), [...SHOWCASE_DB_TABLES].sort())

  for (const [file, allowed] of Object.entries(PUBLIC_FILES)) {
    const src = read(file)
    assert.match(src, /^import \{ supabase \} from '@\/lib\/supabase'$/m, file)
    for (const { names, text } of chains(src)) {
      if (names[0] === 'rpc') { assert.match(text, /rpc\('showcase_registration_count'/); continue }
      const table = tableOf(text)
      assert.ok(allowed.includes(table), `${file}: ${table}`)
      if (table === 'showcase_players') assert.deepEqual(names.slice(0, 2), ['from', 'insert'], 'players: insert only')
    }
  }

  // No other file reaches the database through the browser clients.
  const importers = readdirSync(new URL('../src', import.meta.url), { recursive: true })
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => `src/${f}`)
    .filter((f) => /from '@\/lib\/(supabase|admin-db)'/.test(read(f)))
    .sort()
  assert.deepEqual(importers, [...ADMIN_FILES, ...Object.keys(PUBLIC_FILES)].sort())
})
