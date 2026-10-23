import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as itpTarget from '../src/lib/itp-target.ts'
import * as dbCore from '../src/lib/admin-db-core.ts'

const require = createRequire(import.meta.url)

// Executes the actual TypeScript modules (client factories, adminDb selection, probe route) with
// injected dependencies: no real client, network or database is involved.
function load(path, imports, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, module: { exports }, URL, Response, Headers, AbortSignal, process: { env: {} }, ...globals,
    require(name) {
      if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`)
      return imports[name]
    },
  }, { filename: path })
  return exports
}

const today = 'https://umblyhwumtadlvgccdwg.supabase.co'
const core = 'https://wwomwawpxmkrykybpqok.supabase.co'
// Objects built inside the vm have another realm's prototypes; compare their plain JSON shape.
const plain = (v) => JSON.parse(JSON.stringify(v))
const recorder = () => {
  const calls = []
  return { calls, lib: { createClient: (...args) => { calls.push(plain(args)); return { client: calls.length } } } }
}
const env = (url, schema, extra = {}) => ({
  NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-fixture',
  SUPABASE_SERVICE_ROLE_KEY: 'service-fixture', NEXT_PUBLIC_SUPABASE_DB_SCHEMA: schema, ...extra,
})

test('browser client factory: today exactly as main 0e11cdf, switched adds only the itp schema, bad mix refuses', () => {
  // Today's Production URL ends in a newline (seen in the live bundle); it must pass through unchanged.
  for (const url of [today, `${today}\n`]) {
    const { calls, lib } = recorder()
    const mod = load('../src/lib/supabase.ts', { '@supabase/supabase-js': lib, './itp-target': itpTarget }, { process: { env: env(url, undefined) } })
    assert.deepEqual(calls, [[url, 'anon-fixture', { auth: { storageKey: 'showcase-coordinator-auth' } }]])
    assert.equal(mod.itpSchema, 'public')
  }
  const { calls, lib } = recorder()
  const mod = load('../src/lib/supabase.ts', { '@supabase/supabase-js': lib, './itp-target': itpTarget }, { process: { env: env(core, 'itp') } })
  assert.deepEqual(calls, [[core, 'anon-fixture', { auth: { storageKey: 'showcase-coordinator-auth' }, db: { schema: 'itp' } }]])
  assert.equal(mod.itpSchema, 'itp')

  for (const [url, schema] of [[core, undefined], [today, 'itp'], ['https://elsewhere.supabase.co', undefined]]) {
    const r = recorder()
    assert.throws(() => load('../src/lib/supabase.ts', { '@supabase/supabase-js': r.lib, './itp-target': itpTarget },
      { process: { env: env(url, schema) } }), { name: 'ItpTargetUnusableError' })
    assert.equal(r.calls.length, 0)
  }
})

test('server client factory: today exactly as main 0e11cdf, switched adds only the itp schema', () => {
  const run = (e) => {
    const { calls, lib } = recorder()
    load('../src/lib/supabase-admin.ts', { '@supabase/supabase-js': lib, './itp-target': itpTarget }, { process: { env: e } }).createAdminClient()
    return calls
  }
  assert.deepEqual(run(env(today, '')), [[today, 'service-fixture', { auth: { persistSession: false, autoRefreshToken: false } }]])
  assert.deepEqual(run(env(core, 'itp')), [[core, 'service-fixture', { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: 'itp' } }]])
  assert.throws(() => run(env(core, '')), { name: 'ItpTargetUnusableError' })
  assert.throws(() => run(env(core, 'itp', { SUPABASE_SERVICE_ROLE_KEY: ' ' })), { name: 'ItpTargetUnusableError' })
})

test('adminDb: today is the direct client itself; switched sends each chain as same-origin JSON to /api/admin/db', async () => {
  const direct = { storage: { bucket: 'direct-storage' }, from() { throw new Error('direct client used') } }
  const sent = []
  const fetch = async (url, init) => {
    sent.push({ url, init })
    return { status: 200, json: async () => ({ data: [{ id: 't1' }], error: null }) }
  }
  const load2 = (schema) => load('../src/lib/admin-db.ts', { './supabase': { supabase: direct, itpSchema: schema }, './admin-db-core': dbCore }, { fetch })

  assert.equal(load2('public').adminDb, direct)

  const db = load2('itp').adminDb
  assert.notEqual(db, direct)
  assert.equal(db.storage, direct.storage)
  const res = await db.from('showcase_tasks').update({ status: 'done' }).eq('id', 't1').select('*').single()
  assert.deepEqual(plain(res), { data: [{ id: 't1' }], error: null })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].url, '/api/admin/db')
  assert.equal(sent[0].init.method, 'POST')
  assert.equal(sent[0].init.headers['Content-Type'], 'application/json')
  const req = dbCore.parseDbRequest(JSON.parse(sent[0].init.body))
  assert.deepEqual([req.table, req.action, req.values, req.filters, req.columns, req.single],
    ['showcase_tasks', 'update', { status: 'done' }, [{ op: 'eq', column: 'id', value: 't1' }], '*', true])
})

test('probe route: only the exact bearer token reads move_phase, with the service key, and nothing secret comes back', async () => {
  const token = 'a'.repeat(64)
  const run = async (authorization, extra = {}) => {
    const calls = []
    const fetch = async (url, init) => {
      calls.push({ url, apikey: init.headers.apikey, profile: init.headers['Content-Profile'] })
      return new Response(JSON.stringify({ phase: 'accepted' }), { status: 200 })
    }
    const target = load('../src/lib/itp-target.ts', {}, { fetch })
    const route = load('../src/app/api/itp-move-probe/route.ts', { 'node:crypto': require('node:crypto'), '@/lib/itp-target': target },
      { process: { env: env(core, 'itp', { ITP_MOVE_PROBE_TOKEN: token, VERCEL_DEPLOYMENT_ID: 'dpl_fixture', ...extra }) } })
    const headers = authorization === null ? {} : { authorization }
    const res = await route.GET(new Request('https://coordinator.example/api/itp-move-probe', { headers }))
    const text = await res.text()
    for (const secret of ['anon-fixture', 'service-fixture', token]) assert.ok(!text.includes(secret), 'no secret in the body')
    return { calls, body: JSON.parse(text) }
  }

  for (const auth of [null, '', 'Bearer', `Bearer ${token}x`, `bearer ${token}`, `Basic ${token}`]) {
    const { calls, body } = await run(auth)
    assert.equal(calls.length, 0, String(auth))
    assert.equal(body.error, 'token_required')
  }
  const blank = await run('Bearer ', { ITP_MOVE_PROBE_TOKEN: '' })
  assert.equal(blank.calls.length, 0, 'an unset token never authorizes')

  const { calls, body } = await run(`Bearer ${token}`)
  assert.deepEqual(calls, [{ url: `${core}/rest/v1/rpc/move_phase`, apikey: 'service-fixture', profile: 'itp' }])
  assert.deepEqual(body, { probe: 'itp-move', deployment: 'dpl_fixture', ref: 'wwomwawpxmkrykybpqok', schema: 'itp', phase: 'accepted', error: null, paused: {} })
})
