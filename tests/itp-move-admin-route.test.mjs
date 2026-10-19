import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as dbCore from '../src/lib/admin-db-core.ts'

const require = createRequire(import.meta.url)
const nextServer = require('next/server')

// Execute the actual TypeScript handlers with real Next request/response objects.
// Only the database factory is replaced; this test cannot contact a database.
function loadSource(path, imports, env = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, module: { exports }, atob, URL, process: { env },
    require(name) {
      if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected route dependency: ${name}`)
      return imports[name]
    },
  }, { filename: path })
  return exports
}

test('actual admin database route rejects forged requests before the service client exists', async () => {
  let clients = 0
  let reads = 0
  const auth = loadSource('../src/lib/admin-auth.ts', { 'next/server': nextServer }, {
    COORDINATOR_ADMIN_PASSWORD: 'fixture-password', COORDINATOR_ADMIN_USER: 'admin',
  })
  const route = loadSource('../src/app/api/admin/db/route.ts', {
    'next/server': nextServer,
    '@/lib/admin-auth': auth,
    '@/lib/admin-db-core': dbCore,
    '@/lib/supabase-admin': {
      createAdminClient() {
        clients++
        return { from() { return { select() { reads++; return Promise.resolve({ data: [], error: null }) } } } }
      },
    },
  })
  const url = 'https://coordinator.example/api/admin/db'
  const body = JSON.stringify({ table: 'showcase_tasks', action: 'select', columns: '*' })
  const authorization = `Basic ${Buffer.from('admin:fixture-password').toString('base64')}`
  const call = (headers, requestBody = body) => route.POST(new nextServer.NextRequest(url, {
    method: 'POST', headers, body: requestBody,
  }))
  const good = { authorization, origin: 'https://coordinator.example', 'content-type': 'application/json' }

  assert.equal((await call({ ...good, authorization: '' })).status, 401)
  assert.equal((await call({ ...good, origin: 'https://attacker.example' })).status, 403)
  assert.equal((await call({ ...good, origin: 'null' })).status, 403)
  assert.equal((await call({ authorization, 'content-type': 'application/json' })).status, 403)
  const form = '{"table":"showcase_tasks","action":"delete","filters":[{"op":"eq","column":"event_id","value":"fixture"}],"padding":"="}\r\n'
  assert.equal((await call({ ...good, origin: 'https://attacker.example', 'content-type': 'text/plain' }, form)).status, 403)
  assert.equal((await call(good, '{invalid')).status, 400)
  assert.equal(clients, 0)
  assert.equal(reads, 0)

  const accepted = await call(good)
  assert.equal(accepted.status, 200)
  assert.deepEqual(await accepted.json(), { data: [], error: null })
  assert.equal(clients, 1)
  assert.equal(reads, 1)
})
