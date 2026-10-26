import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as normalize from '../src/lib/name-normalize.ts'

const code = ts.transpileModule(readFileSync(new URL('../src/lib/invite-list.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exports = {}
vm.runInNewContext(code, { exports, require(name) {
  if (name === './name-normalize') return normalize
  throw new Error(`Unexpected dependency: ${name}`)
} })
const { visibleInvites } = exports
const ids = (rows) => Array.from(rows, (row) => row.id)
const row = (id, name, club, extra = {}) => ({ id, name, club, invited_by: 'Thomas', status: 'invited', player: null, ...extra })
const rows = [
  row('z', 'Zoe Weber', 'Bonner SC'),
  row('a', 'Änne Müller', 'Bonner SC', { invited_by: 'Max', status: 'accepted' }),
  row('n', 'Noah Klein', null),
  row('b', 'Ben Alt', '', { status: 'declined', player: { name: 'Benjamin Neu', club: 'Alemannia Aachen' } }),
]

test('searches names and clubs, including the displayed sign-up name and club fallback', () => {
  assert.deepEqual(ids(visibleInvites(rows, '  MUELLER  ', 'name')), ['a'])
  assert.deepEqual(ids(visibleInvites(rows, 'bonner sc', 'name')), ['a', 'z'])
  assert.deepEqual(ids(visibleInvites(rows, 'Zoe Bonner', 'name')), ['z'])
  assert.deepEqual(ids(visibleInvites(rows, 'Benjamin', 'name')), ['b'])
  assert.deepEqual(ids(visibleInvites(rows, 'Aachen', 'name')), ['b'])
  assert.deepEqual(ids(visibleInvites(rows, 'nonexistent', 'name')), [])
})

test('club sorting groups matching clubs, sorts names within each club and puts missing clubs last', () => {
  assert.deepEqual(ids(visibleInvites(rows, '', 'club')), ['b', 'a', 'z', 'n'])
  assert.deepEqual(ids(visibleInvites(rows, 'Bonner', 'club')), ['a', 'z'])
  const variants = [row('2', 'Zoe', ' bonner SC '), row('1', 'Anna', 'Bonner SC')]
  assert.deepEqual(ids(visibleInvites(variants, '', 'club')), ['1', '2'])
})

test('keeps existing status and inviter choices and uses the name shown in each row', () => {
  assert.deepEqual(ids(visibleInvites(rows, '', 'status')), ['a', 'n', 'z', 'b'])
  assert.deepEqual(ids(visibleInvites(rows, '', 'inviter')), ['a', 'b', 'n', 'z'])
  assert.deepEqual(ids(visibleInvites(rows, '', 'name')), ['a', 'b', 'n', 'z'])
})

test('clearing search restores every invitation without changing source order or content', () => {
  const before = JSON.stringify(rows)
  visibleInvites(rows, 'Bonner', 'club')
  assert.equal(visibleInvites(rows, '   ', 'club').length, rows.length)
  assert.equal(JSON.stringify(rows), before)
})
