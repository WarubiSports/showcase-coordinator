import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'

// The name dialog decision the shell makes, with the three situations from Marvin's report (23.10)
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const st = load('../src/lib/staff-state.ts', { '@/lib/staff-cookie': { STAFF_COOKIE: 'showcase-staff' } })
// Objects built inside the vm carry another realm's prototype; compare their plain shape
const plain = (v) => JSON.parse(JSON.stringify(v))
const marvin = { id: 'u1', full_name: 'Marvin Teststaff', email: 'm@example.test', role: 'staff' }
const ask = (check, staffCookie = false, hasUser = false) => st.shouldAskForName({ hasUser, check, staffCookie })

test('shell with the identity from the server: no dialog, before and after the client check, even when that fails', () => {
  const check = st.initialStaffCheck(marvin)
  assert.deepEqual(plain(check), { staff: marvin, loaded: true, failed: false })
  assert.equal(ask(check), false, 'first paint')
  assert.equal(ask(st.afterMeResult(check, { ok: true, staff: marvin })), false, 'after the refresh')
  const failed = st.afterMeResult(check, { ok: false })
  assert.deepEqual(plain(failed), { staff: marvin, loaded: true, failed: true }, 'a failed refresh keeps the identity')
  assert.equal(ask(failed), false)
})

test('shell with a failing me call but a staff cookie: no dialog, with or without a server answer', () => {
  assert.equal(st.hasStaffCookie('showcase-staff=abc; other=1'), true)
  assert.equal(st.hasStaffCookie(' showcase-staff.0=abc; showcase-staff.1=def'), true, 'chunked cookie')
  assert.equal(st.hasStaffCookie('other=1'), false)
  let check = st.initialStaffCheck(undefined)
  assert.equal(ask(check, true), false, 'before the check')
  check = st.afterMeResult(check, { ok: false })
  assert.equal(ask(check, true), false, 'after it failed for good')
  assert.equal(ask(check, false), false, 'a failed check never opens the dialog, cookie or not')
  assert.equal(ask(st.afterMeResult(st.initialStaffCheck(undefined), { ok: true, staff: null }), true), false, 'a 200 with staff null still bows to the cookie')
})

test('basic auth without a stored name: the dialog, once the check answered 200 with staff null', () => {
  assert.equal(ask(st.initialStaffCheck(undefined)), false, 'not before the check answered')
  assert.equal(ask(st.afterMeResult(st.initialStaffCheck(undefined), { ok: true, staff: null })), true)
  assert.equal(ask(st.initialStaffCheck(null)), true, 'the server layout answered: no staff behind the cookies')
  assert.equal(ask(st.initialStaffCheck(null), false, true), false, 'a stored name is enough')
})
