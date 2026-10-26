import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as normalize from '../src/lib/name-normalize.ts'

// The club's crest in the photo slot (Matthew, 26.10): exact club match only, never over a photo, initials when nothing
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const crest = load('../src/lib/club-crest.ts', { '@/lib/name-normalize': normalize })
const plain = (v) => JSON.parse(JSON.stringify(v))

// The shape FuPa's club search returns for "Bonner SC" (26.10), paths only
const hits = [
  { type: 'club', id: 1, name: 'Bonner SC Futsal Lions', image: { path: 'https://image.fupa.net/club/d6MISRUl6W0i/', svg: false } },
  { type: 'player', id: 2, name: 'Bonner SC', image: { path: 'https://image.fupa.net/player/x/' } },
  { type: 'club', id: 3, name: 'Bonner SC', image: { path: 'https://image.fupa.net/club/gY9niiFAE2nN/', svg: true } },
  { type: 'club', id: 4, name: 'Bonner SV Roleber', image: { path: 'https://image.fupa.net/club/hqSqGRkIRWXe/', svg: false } },
]
const BONNER = 'https://image.fupa.net/club/gY9niiFAE2nN/100x100.png'

test('crest resolved only on an exact club match, from a club hit on image.fupa.net', () => {
  assert.equal(crest.crestFromHits(hits, 'Bonner SC'), BONNER)
  assert.equal(crest.crestFromHits(hits, 'bonner sc'), BONNER, 'case and spacing do not matter')
  assert.equal(crest.crestFromHits(hits, 'Bonner'), null, 'a prefix is not a match')
  assert.equal(crest.crestFromHits(hits, 'Bonner SC II'), null, 'a second team is not the club')
  assert.equal(crest.crestFromHits(hits, 'SC Bonn'), null)
  assert.equal(crest.crestFromHits(hits, null), null)
  assert.equal(crest.crestFromHits([{ type: 'club', name: 'Bonner SC', image: { path: 'https://evil.test/club/x/' } }], 'Bonner SC'), null, 'another host is dropped')
  assert.equal(crest.crestFromHits([{ type: 'club', name: 'Bonner SC' }], 'Bonner SC'), null, 'no image, no crest')
})

test('never when a photo exists; stats carry the crest, an empty season record when there are none', () => {
  const noPhoto = { photo_url: null, club: 'Bonner SC', stats: null }
  assert.deepEqual(plain(crest.crestDecision(noPhoto, BONNER)), { stats: { season: null, games: 0, goals: 0, assists: 0, team: null, league: null, club_crest: BONNER } })
  assert.equal(crest.crestDecision({ ...noPhoto, photo_url: 'https://image.fupa.net/player/1/960x1200.jpeg' }, BONNER), null, 'a photo wins')
  assert.equal(crest.crestDecision(noPhoto, null), null, 'no hit, nothing written')
  const withStats = { photo_url: null, club: 'Bonner SC', stats: { season: '26/27', games: 3, goals: 1, assists: 0, team: 'Bonner SC', league: 'Mittelrheinliga' } }
  assert.deepEqual(plain(crest.crestDecision(withStats, BONNER)), { stats: { ...withStats.stats, club_crest: BONNER } }, 'FuPa numbers stay')
  assert.equal(crest.crestClub(withStats), 'Bonner SC')
  assert.equal(crest.crestClub({ club: 'Bonner SC', stats: { ...withStats.stats, team: 'Bonner SC U19' } }), 'Bonner SC U19', 'FuPa team name first')
  assert.equal(crest.crestClub({ club: null, stats: null }), null)
})

test('what the card shows: the crest only without a photo, initials when there is neither', () => {
  const stats = { season: null, games: 0, goals: 0, assists: 0, team: null, league: null, club_crest: BONNER }
  assert.equal(crest.clubCrest({ photo_url: null, stats }), BONNER)
  assert.equal(crest.clubCrest({ photo_url: 'https://image.fupa.net/player/1/960x1200.jpeg', stats }), null, 'a photo shows, not the crest')
  assert.equal(crest.clubCrest({ photo_url: null, stats: null }), null, 'nothing: initials')
  assert.equal(crest.hasSeasonStats(stats), false, 'a crest-only record prints no numbers in the staff row')
  assert.equal(crest.hasSeasonStats({ ...stats, games: 3, season: '26/27' }), true)
})
