import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as fupaLink from '../src/lib/fupa-link.ts'
import * as normalize from '../src/lib/name-normalize.ts'

// Runs the real search module without its fetch half: hits are fixtures, nothing goes to FuPa.
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, URL, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const fs = load('../src/lib/fupa-search.ts', { '@/lib/fupa-fetch': { readCapped: async () => null }, '@/lib/fupa-link': fupaLink, '@/lib/name-normalize': normalize })
const plain = (v) => JSON.parse(JSON.stringify(v))

// Fake players only. Club names are real club shapes, the people are not.
const hit = (over = {}) => ({
  type: 'player', id: 1, name: 'Timo Testspieler', birthday: '2008-03-01', slug: 'timo-testspieler-1', linkUrl: '/player/timo-testspieler-1', position: 'Angriff',
  image: { path: 'https://image.fupa.net/player/abc123/', svg: false },
  club: { id: 7, slug: 'sv-beispielhausen', name: 'SV Beispielhausen', image: { path: 'https://image.fupa.net/club/club1/', svg: false } },
  level: 9, region: { id: 1, slug: 'mittelrhein', name: 'Mittelrhein' }, district: { id: 2, slug: 'koeln', name: 'Köln' }, score: 300, ...over,
})

test('name normalisation: case, spaces, hyphens, umlauts and accents', () => {
  assert.equal(fs.normalizeName('Jan-Luca Müller'), fs.normalizeName('jan luca mueller'))
  assert.equal(fs.normalizeName('René Groß'), 'renegross')
  assert.equal(fs.normalizeName("O'Brien"), 'obrien')
  assert.notEqual(fs.normalizeName('Timo Testspieler'), fs.normalizeName('Tim Testspieler'))
  assert.equal(fs.normalizeClub('SSV Jan Wellem 05 Bergisch Gladbach'), 'ssvjanwellem05bergischgladbach')
})

test('candidates: exact-name hits only, best score first, images sized on image.fupa.net only', () => {
  const hits = [hit({ id: 2, name: 'Timo Testspiel', score: 500 }), hit({ id: 3, score: 100, club: { name: 'TuS Musterstadt', image: { path: 'https://evil.example/club/x/' } } }), hit({ id: 1, score: 300 }), hit({ id: 4, type: 'team' }), hit({ id: 5, linkUrl: '/team/x' })]
  const c = plain(fs.candidatesFor(hits, 'timo-testspieler'))
  assert.deepEqual(c.map((x) => x.id), [1, 3])
  assert.equal(c[0].image, 'https://image.fupa.net/player/abc123/960x1200.jpeg')
  assert.equal(c[0].club_image, 'https://image.fupa.net/club/club1/100x100.png')
  assert.equal(c[1].club_image, null)
  assert.equal(c[0].birth_year, 2008)
  assert.equal(fs.candidateProfileUrl(c[0]), 'https://www.fupa.net/player/timo-testspieler-1')
})

test('pick: the only hit; several hits only when the typed club singles one out', () => {
  const one = fs.candidatesFor([hit()], 'Timo Testspieler')
  assert.equal(fs.pickCandidate(one, null).id, 1)
  const two = fs.candidatesFor([hit({ id: 1 }), hit({ id: 3, club: { name: 'TuS Musterstadt' } })], 'Timo Testspieler')
  assert.equal(fs.pickCandidate(two, null), null)
  assert.equal(fs.pickCandidate(two, 'Beispielhausen').id, 1)
  assert.equal(fs.pickCandidate(two, 'TuS Musterstadt 1912 e.V.').id, 3)
  assert.equal(fs.pickCandidate(two, 'FC Anderswo'), null)
  const twins = fs.candidatesFor([hit({ id: 1 }), hit({ id: 9 })], 'Timo Testspieler')
  assert.equal(fs.pickCandidate(twins, 'SV Beispielhausen'), null, 'two hits at the same club: nobody is picked')
  assert.equal(fs.pickCandidate([], 'SV Beispielhausen'), null)
})
