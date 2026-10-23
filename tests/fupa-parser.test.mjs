import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as profileUrl from '../src/lib/profile-url.ts'

// Runs the real parser (src/lib/fupa.ts) on fixture pages. No network: the fetching half is not loaded.
function load(path, imports) {
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
const { parseFupaHtml, isFupaUrl, careerTotals } = load('../src/lib/fupa.ts', { '@/lib/profile-url': profileUrl })
const plain = (v) => JSON.parse(JSON.stringify(v))

// Fixtures use fake players only. Club names are real club shapes because the bug is about how FuPa nests them.
const teamOf = (slug, team, league, seasonName) => ({ slug, name: { full: team }, competition: { name: league, season: { name: seasonName } } })
const season = (slug, seasonName, matches, goals, assists, team, league) => ({
  id: slug, team: teamOf(slug, team, league, seasonName),
  statistics: { matches, goals, assists, yellowCard: 0, yellowRedCard: 0, redCard: 0, minutes: 0 },
})
const page = ({ currentTeam, seasons, position = 'Sturm', image = { path: 'player/abc123' }, og = 'https://image.fupa.net/player/abc123/960x1200.jpeg' }) => {
  const redux = { dataHistory: [{ key: 'x', PlayerPage: { data: { id: 1, slug: 'timo-testspieler-1', firstName: 'Timo', lastName: 'Testspieler', image, position, currentTeam, currentRole: { position, team: null }, playerRole: { total: {}, seasons } } } }] }
  return `<html><head>${og ? `<meta property="og:image" content="${og}">` : ''}</head><body><script>window.REDUX_DATA = ${JSON.stringify(redux)};</script></body></html>`
}

test('fupa urls: fupa.net only, lookalikes and transfermarkt are not enriched', () => {
  assert.equal(isFupaUrl('https://www.fupa.net/player/timo-testspieler-1'), true)
  assert.equal(isFupaUrl('https://www.transfermarkt.de/x/profil/spieler/1'), false)
  assert.equal(isFupaUrl('https://fupa.net.evil.com/x'), false)
})

test('same team for club and newest season: club, league, position, photo and newest-season stats', () => {
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-beispielhausen-m1-2026-27', 'SV Beispielhausen', 'Kreisliga A', '26/27'),
    seasons: [season('sv-beispielhausen-m1-2025-26', '25/26', 20, 9, 4, 'SV Beispielhausen', 'Kreisliga B'), season('sv-beispielhausen-m1-2026-27', '26/27', 7, 3, 1, 'SV Beispielhausen', 'Kreisliga A')],
  })))
  assert.equal(p.photo_url, 'https://image.fupa.net/player/abc123/960x1200.jpeg')
  assert.equal(p.club, 'SV Beispielhausen')
  assert.equal(p.league, 'Kreisliga A')
  assert.equal(p.position, 'Sturm')
  assert.deepEqual(p.stats, { season: '26/27', games: 7, goals: 3, assists: 1, team: 'SV Beispielhausen', league: 'Kreisliga A' })
})

test('club first team in a higher league than the team the player plays for: the newest season wins', () => {
  // Observed on production 23.10: currentTeam = the club's first team (Bundesliga), the newest season = the reserve
  // side (Regionalliga Nord). The card must not read as a Bundesliga player.
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('hamburger-sv-m1-2026-27', 'Hamburger SV', 'Bundesliga', '26/27'),
    seasons: [season('hamburger-sv-m2-2026-27', '26/27', 2, 0, 1, 'Hamburger SV II', 'Regionalliga Nord')],
  })))
  assert.equal(p.club, 'Hamburger SV II')
  assert.equal(p.league, 'Regionalliga Nord')
  assert.deepEqual(p.stats, { season: '26/27', games: 2, goals: 0, assists: 1, team: 'Hamburger SV II', league: 'Regionalliga Nord' })
})

test('newest season without a league: the club competition is the fallback', () => {
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-beispielhausen-m1-2026-27', 'SV Beispielhausen', 'Kreisliga A', '26/27'),
    seasons: [{ id: 's', team: { slug: 'sv-beispielhausen-m2-2026-27', name: { full: 'SV Beispielhausen II' } }, statistics: { matches: 3, goals: 1, assists: 0 } }],
  })))
  assert.equal(p.club, 'SV Beispielhausen')
  assert.equal(p.league, 'Kreisliga A')
  assert.deepEqual(p.stats, { season: null, games: 3, goals: 1, assists: 0, team: 'SV Beispielhausen II', league: null })
})

test('newest season older than the current team (transfer, no games yet): the current team is shown', () => {
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('fc-neuclub-m1-2026-27', 'FC Neuclub', 'Landesliga', '26/27'),
    seasons: [season('sv-beispielhausen-m1-2025-26', '25/26', 20, 9, 4, 'SV Beispielhausen', 'Kreisliga B')],
  })))
  assert.equal(p.club, 'FC Neuclub')
  assert.equal(p.league, 'Landesliga')
  assert.equal(p.stats.season, '25/26')
})

test('career totals: every season with numbers is summed, a season without numbers is skipped, none means no career', () => {
  const current = teamOf('sv-beispielhausen-m1-2026-27', 'SV Beispielhausen', 'Kreisliga A', '26/27')
  const noNumbers = { id: 'x', team: teamOf('sv-beispielhausen-m1-2023-24', 'SV Beispielhausen', 'Kreisliga B', '23/24'), statistics: { yellowCard: 1 } }
  const p = plain(parseFupaHtml(page({ currentTeam: current, seasons: [
    season('sv-beispielhausen-m1-2024-25', '24/25', 28, 12, 3, 'SV Beispielhausen', 'Kreisliga B'),
    noNumbers,
    season('sv-beispielhausen-m1-2025-26', '25/26', 30, 11, 2, 'SV Beispielhausen', 'Kreisliga B'),
    season('sv-beispielhausen-m1-2026-27', '26/27', 7, 3, 1, 'SV Beispielhausen', 'Kreisliga A'),
  ] })))
  assert.deepEqual(p.stats.career, { games: 65, goals: 26, assists: 6, seasons: 3 })
  assert.equal(p.stats.games, 7, 'the season line still shows the newest season only')
  const one = plain(parseFupaHtml(page({ currentTeam: current, seasons: [season('sv-beispielhausen-m1-2026-27', '26/27', 1, 0, 0, 'SV Beispielhausen', 'Kreisliga A')] })))
  assert.deepEqual(one.stats.career, { games: 1, goals: 0, assists: 0, seasons: 1 })
  assert.equal(parseFupaHtml(page({ currentTeam: current, seasons: [] })).stats, null, 'no season with numbers: no stats, no career')
  assert.equal(plain(careerTotals([noNumbers])), null)
})

test('photos: only https on fupa.net, image path as fallback, no data means null', () => {
  const base = { currentTeam: teamOf('sv-beispielhausen-m1-2026-27', 'SV Beispielhausen', 'Kreisliga A', '26/27'), seasons: [] }
  assert.equal(parseFupaHtml(page({ ...base, og: null })).photo_url, 'https://image.fupa.net/player/abc123/960x1200.jpeg')
  assert.equal(parseFupaHtml(page({ ...base, og: 'https://evil.example/x.jpeg', image: null })).photo_url, null)
  assert.equal(parseFupaHtml(page({ ...base, og: 'http://image.fupa.net/x.jpeg', image: null })).photo_url, null)
  assert.equal(parseFupaHtml('<html><body>nothing</body></html>'), null)
  assert.equal(parseFupaHtml(page(base).split('"Sturm"').join('"St{urm}"')).position, 'St{urm}')
})
