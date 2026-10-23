import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as normalize from '../src/lib/name-normalize.ts'
import { parseInviteLines } from '../src/lib/invite-lines.ts'

// The add-invites panel's rules: which lookup result a typed name gets, and what the paste format yields
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const resolve = load('../src/lib/lookup-resolve.ts', { '@/lib/name-normalize': normalize })
const plain = (v) => JSON.parse(JSON.stringify(v))
const base = (id, name, signed, club = 'SV Beispielhausen') => ({ id, name, club, birth_year: 2008, stage: signed ? 'Signed' : 'New', phone: null, signed, signed_date: signed ? '2026-09-22' : null })
const fupa = (id, club) => ({ id, name: 'Timo Testspieler', link_url: `/player/timo-testspieler-${id}`, position: 'Angriff', image: null, club, club_image: null, level: 9, region: 'Mittelrhein', district: 'Köln', birth_year: 2008, score: 300 })

test('Base first: one exact-name match is taken, several are offered, partial-only matches are offered too', () => {
  const one = resolve.resolveBase('Timo Testspieler', [base('a', 'Timo Testspieler', true), base('b', 'Timo Testspielerin', false)])
  assert.equal(one.kind, 'base'); assert.equal(one.match.id, 'a'); assert.equal(one.auto, true)
  assert.deepEqual(plain(resolve.lookupResult(one)), { ausa_athlete_id: 'a', category: 'signed' })
  const two = resolve.resolveBase('timo-testspieler', [base('a', 'Timo Testspieler', true), base('c', 'Timo Testspieler', false)])
  assert.equal(two.kind, 'base-pick'); assert.equal(two.matches.length, 2)
  const partial = resolve.resolveBase('Timo', [base('b', 'Timo Testspielerin', false)])
  assert.equal(partial.kind, 'base-pick')
  assert.equal(resolve.resolveBase('Timo Testspieler', []), null, 'nobody in Base: FuPa is next')
})

test('FuPa only when Base has nobody: one hit is taken as New with its page as the link, several are offered, none says so', () => {
  const one = resolve.resolveFupa([fupa(1, 'SV Beispielhausen')])
  assert.equal(one.kind, 'fupa')
  assert.deepEqual(plain(resolve.lookupResult(one)), { profile_url: 'https://www.fupa.net/player/timo-testspieler-1', category: 'new' })
  assert.equal(resolve.resolveFupa([fupa(1, 'SV Beispielhausen'), fupa(2, 'TuS Musterstadt')]).kind, 'fupa-pick')
  assert.equal(resolve.resolveFupa([]).kind, 'none')
  assert.equal(resolve.resolveFupa(null).kind, 'none')
  assert.deepEqual(plain(resolve.lookupResult({ kind: 'none' })), { category: 'new' })
})

test('paste format: one name per line, phone optional after a comma, a pasted link is ignored', () => {
  assert.deepEqual(parseInviteLines('Timo Testspieler, 0151 2345678\nJonas Probekick\n\nLuca Platzhalter; https://www.fupa.net/player/x\n'), [
    { name: 'Timo Testspieler', phone: '0151 2345678' }, { name: 'Jonas Probekick' }, { name: 'Luca Platzhalter' },
  ])
})
