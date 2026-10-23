import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const nextServer = require('next/server')
const { NextRequest } = nextServer

// The actual middleware with real Next request and response objects. Only the staff session lookup is
// replaced (no Supabase here): it answers with whatever identity the test hands in.
function loadMiddleware(staffIdentity = null) {
  const source = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  const imports = {
    'next/server': nextServer,
    '@/lib/staff-session': { getStaffIdentity: async () => staffIdentity },
    '@/lib/staff-cookie': { STAFF_COOKIE: 'showcase-staff' },
  }
  vm.runInNewContext(code, {
    exports, module: { exports }, atob, URL, process: { env: { COORDINATOR_ADMIN_USER: 'admin', COORDINATOR_ADMIN_PASSWORD: 'pw' } },
    require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected middleware dependency: ${name}`); return imports[name] },
  }, { filename: 'src/middleware.ts' })
  return exports.middleware
}

const ORIGIN = 'https://coordinator.test'
const request = (path, headers = {}) => new NextRequest(`${ORIGIN}${path}`, { headers })
const BASIC = 'Basic ' + Buffer.from('admin:pw').toString('base64')
const STAFF = { cookie: 'showcase-staff=some-session-cookie' }
const where = (res) => res.headers.get('location')?.replace(ORIGIN, '')
const challenged = (res) => res.status === 401 && /^Basic /.test(res.headers.get('www-authenticate') ?? '')
const passed = (res) => res.status === 200 && res.headers.get('x-middleware-next') === '1'

test('a staff session on an admin-only page is sent to the invite area with the notice, never challenged', async () => {
  const middleware = loadMiddleware()
  for (const path of ['/', '/players', '/settings', '/tasks?view=table']) {
    const res = await middleware(request(path, STAFF))
    assert.equal(res.status, 307, path)
    assert.equal(where(res), '/invites?notice=admin-only', path)
    assert.equal(res.headers.get('www-authenticate'), null, `${path}: no password box`)
  }
})

test('a visitor on the root or an admin page goes to the login page, never challenged', async () => {
  const middleware = loadMiddleware()
  assert.equal(where(await middleware(request('/'))), '/login?next=%2F')
  const res = await middleware(request('/players?x=1'))
  assert.equal(res.status, 307)
  assert.equal(where(res), '/login?next=%2Fplayers%3Fx%3D1')
  assert.equal(res.headers.get('www-authenticate'), null)
})

test('/admin is the one page that asks for the password; with the password it leads to the dashboard', async () => {
  const middleware = loadMiddleware()
  assert.ok(challenged(await middleware(request('/admin'))), 'no auth: Basic challenge')
  assert.ok(challenged(await middleware(request('/admin', STAFF))), 'a staff session clicking the link gets the challenge too')
  const res = await middleware(request('/admin', { authorization: BASIC }))
  assert.equal(res.status, 307)
  assert.equal(where(res), '/')
})

test('the admin password still opens every admin page and API as before', async () => {
  const middleware = loadMiddleware()
  for (const path of ['/', '/players', '/settings', '/invites', '/api/admin/db']) {
    assert.ok(passed(await middleware(request(path, { authorization: BASIC }))), path)
  }
  assert.ok(!passed(await middleware(request('/', { authorization: 'Basic ' + Buffer.from('admin:wrong').toString('base64') }))), 'a wrong password is not a login')
})

test('APIs are unchanged: anonymous gets the Basic challenge, a staff session a JSON 403, the invite APIs a JSON 401', async () => {
  const middleware = loadMiddleware()
  assert.ok(challenged(await middleware(request('/api/admin/db'))), 'db proxy without auth: the loader signs in through the challenge')
  const staffOnAdminApi = await middleware(request('/api/admin/db', STAFF))
  assert.equal(staffOnAdminApi.status, 403)
  assert.equal(staffOnAdminApi.headers.get('www-authenticate'), null)
  assert.deepEqual(await staffOnAdminApi.json(), { error: 'Admin login required' })
  const inviteApi = await middleware(request('/api/admin/invites?event_id=x'))
  assert.equal(inviteApi.status, 401)
  assert.equal(inviteApi.headers.get('www-authenticate'), null)
})

test('the invite area and the public player routes are unchanged', async () => {
  const anonymous = loadMiddleware(null)
  assert.equal(where(await anonymous(request('/invites'))), '/login?next=%2Finvites')
  assert.equal(where(await anonymous(request('/invites', STAFF))), '/login?next=%2Finvites', 'an invalid session cookie goes to the login, not to the password box')
  const signedIn = loadMiddleware({ id: 'u1', email: 'staff@example.test', full_name: 'Staff Person' })
  assert.ok(passed(await signedIn(request('/invites', STAFF))))
  assert.ok(passed(await signedIn(request('/invites/roster', STAFF))))
  assert.ok(passed(await signedIn(request('/api/admin/invites?event_id=x', STAFF))))
  for (const path of ['/invite/some-token', '/api/invite/some-token', '/invite/some-token/opengraph-image', '/login', '/event/808-showcase-boys']) {
    assert.ok(passed(await anonymous(request(path))), `${path} stays public`)
  }
})
