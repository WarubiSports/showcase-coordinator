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
const teamOf = (slug, team, league, seasonName, ageGroup) => ({ slug, name: { full: team }, ...(ageGroup ? { ageGroup } : {}), competition: { name: league, season: { name: seasonName } } })
const season = (slug, seasonName, matches, goals, assists, team, league, ageGroup) => ({
  id: slug, team: teamOf(slug, team, league, seasonName, ageGroup),
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
  assert.deepEqual(p.stats, { season: '26/27', games: 7, goals: 3, assists: 1, team: 'SV Beispielhausen', league: 'Kreisliga A', career: { games: 27, goals: 12, assists: 5, seasons: 2 } })
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
  assert.deepEqual(p.stats, { season: '26/27', games: 2, goals: 0, assists: 1, team: 'Hamburger SV II', league: 'Regionalliga Nord', career: { games: 2, goals: 0, assists: 1, seasons: 1 } })
})

test('newest season without a league: the club competition is the fallback', () => {
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-beispielhausen-m1-2026-27', 'SV Beispielhausen', 'Kreisliga A', '26/27'),
    seasons: [{ id: 's', team: { slug: 'sv-beispielhausen-m2-2026-27', name: { full: 'SV Beispielhausen II' } }, statistics: { matches: 3, goals: 1, assists: 0 } }],
  })))
  assert.equal(p.club, 'SV Beispielhausen')
  assert.equal(p.league, 'Kreisliga A')
  assert.deepEqual(p.stats, { season: null, games: 3, goals: 1, assists: 0, team: 'SV Beispielhausen II', league: null, career: { games: 3, goals: 1, assists: 0, seasons: 1 } })
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

// Age groups exactly as FuPa serves them (team.ageGroup): the men's teams are { slug: 'm', name: 'Herren' }
const HERREN = { slug: 'm', name: 'Herren' }
const U19 = { slug: 'u19-', name: 'A-Jugend (U19)' }
const U17 = { slug: 'u17-', name: 'B-Jugend (U17)' }
const FRAUEN = { slug: 'f', name: 'Frauen' }

test('U19 and men\'s team in the newest season: the card is the U19 row, the men\'s row is the second line (shape of 27.10 Bonn example)', () => {
  // The men's team is the current team, 0-game qualification round of the U19 listed before the real league season
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('fv-beispielstadt-m1-2026-27', 'FV Beispielstadt', 'Kreisliga B1 Beispielstadt', '26/27', HERREN),
    seasons: [
      season('fv-beispielstadt-m1-2026-27', '26/27', 2, 4, 0, 'FV Beispielstadt', 'Kreisliga B1 Beispielstadt', HERREN),
      season('fv-beispielstadt-u19-2-autumn2026', 'Herbst 26', 0, 0, 0, 'FV Beispielstadt', 'A-Junioren-Staffel 6 Qualifikation Herbst 26', U19),
      season('fv-beispielstadt-u19-1-2026-27', '26/27', 5, 8, 2, 'FV Beispielstadt', 'A-Junioren-Bezirksliga Mittelrhein Staffel 1', U19),
      season('fv-beispielstadt-u19-2-2025-26', '25/26', 1, 1, 0, 'FV Beispielstadt', 'A-Junioren-Sonderliga Beispielstadt, Staffel 1', U19),
      season('fv-beispielstadt-u19-1-2025-26', '25/26', 10, 3, 2, 'FV Beispielstadt', 'A-Junioren-Bezirksliga Mittelrhein Staffel 1', U19),
    ],
  })))
  assert.equal(p.club, 'FV Beispielstadt')
  assert.equal(p.league, 'A-Junioren-Bezirksliga Mittelrhein Staffel 1', 'the league guard of #7 still reads the season row, now the U19 one')
  assert.deepEqual(p.stats, {
    season: '26/27', games: 5, goals: 8, assists: 2, team: 'FV Beispielstadt', league: 'A-Junioren-Bezirksliga Mittelrhein Staffel 1',
    career: { games: 18, goals: 16, assists: 4, seasons: 5 },
    senior: { team: 'FV Beispielstadt', league: 'Kreisliga B1 Beispielstadt', season: '26/27', games: 2, goals: 4, assists: 0 },
  })
})

test('U19 and men\'s team, men\'s team in the higher league: the U19 league and numbers on the card, the men\'s numbers second', () => {
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-musterdorf-m1-2026-27', 'SV Musterdorf', 'Bezirksliga Mittelrhein Staffel 3', '26/27', HERREN),
    seasons: [
      season('sv-musterdorf-m1-2026-27', '26/27', 5, 0, 0, 'SV Musterdorf', 'Bezirksliga Mittelrhein Staffel 3', HERREN),
      season('sv-musterdorf-u19-1-2026-27', '26/27', 4, 0, 0, 'SV Musterdorf', 'A-Junioren-Bezirksliga Mittelrhein Staffel 2', U19),
      season('sv-musterdorf-u19-1-2025-26', '25/26', 20, 4, 3, 'SV Musterdorf', 'A-Junioren-Bezirksliga Mittelrhein Staffel 2', U19),
      season('sv-musterdorf-u17-1-2024-25', '24/25', 3, 1, 0, 'SV Musterdorf', 'B-Junioren-Bezirksliga Mittelrhein Staffel 2', U17),
    ],
  })))
  assert.equal(p.league, 'A-Junioren-Bezirksliga Mittelrhein Staffel 2')
  assert.equal(p.stats.games, 4)
  assert.equal(p.stats.league, 'A-Junioren-Bezirksliga Mittelrhein Staffel 2')
  assert.deepEqual(p.stats.senior, { team: 'SV Musterdorf', league: 'Bezirksliga Mittelrhein Staffel 3', season: '26/27', games: 5, goals: 0, assists: 0 })
  assert.deepEqual(p.stats.career, { games: 32, goals: 5, assists: 3, seasons: 4 }, 'career totals unchanged: every row counts')
})

test('only men\'s rows in the newest season (an older U19 row exists): the men\'s row stays the card, no second line', () => {
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-altenbach-m1-2026-27', 'SV Altenbach', 'Kreisliga A Altenbach', '26/27', HERREN),
    seasons: [
      season('sv-altenbach-m1-2026-27', '26/27', 5, 0, 0, 'SV Altenbach', 'Kreisliga A Altenbach', HERREN),
      season('sv-altenbach-m2-2026-27', '26/27', 2, 1, 1, 'SV Altenbach', 'Kreisliga B, Gruppe 1, Altenbach', HERREN),
      season('sv-altenbach-m1-2025-26', '25/26', 10, 1, 0, 'SV Altenbach', 'Kreisliga B, Gruppe 2, Altenbach', HERREN),
      season('sv-neudorf-u19-1-2023-24', '23/24', 27, 8, 4, 'SV Neudorf', 'A-Junioren-Sonderliga Neudorf', U19),
    ],
  })))
  assert.equal(p.club, 'SV Altenbach')
  assert.equal(p.league, 'Kreisliga A Altenbach')
  assert.deepEqual(p.stats, { season: '26/27', games: 5, goals: 0, assists: 0, team: 'SV Altenbach', league: 'Kreisliga A Altenbach', career: { games: 44, goals: 10, assists: 5, seasons: 4 } })
  assert.equal('senior' in p.stats, false)
})

test('youth row only, or a youth row beside an unknown age group: no second line', () => {
  const youthOnly = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-musterdorf-u19-1-2026-27', 'SV Musterdorf', 'A-Junioren-Bezirksliga', '26/27', U19),
    seasons: [season('sv-musterdorf-u19-1-2026-27', '26/27', 9, 2, 1, 'SV Musterdorf', 'A-Junioren-Bezirksliga', U19)],
  })))
  assert.equal(youthOnly.stats.games, 9)
  assert.equal('senior' in youthOnly.stats, false)
  // Frauen is no youth side and no men's line: the first row of the newest season stays the card, as before
  const women = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-musterdorf-f1-2026-27', 'SV Musterdorf', 'Landesliga Frauen', '26/27', FRAUEN),
    seasons: [season('sv-musterdorf-f1-2026-27', '26/27', 6, 3, 0, 'SV Musterdorf', 'Landesliga Frauen', FRAUEN)],
  })))
  assert.equal(women.league, 'Landesliga Frauen')
  assert.equal(women.stats.games, 6)
  assert.equal('senior' in women.stats, false)
})

test('a youth row without games numbers is no card row: the old newest-season logic applies', () => {
  const noNumbers = { id: 'y', team: teamOf('sv-musterdorf-u19-1-2026-27', 'SV Musterdorf', 'A-Junioren-Bezirksliga', '26/27', U19), statistics: { yellowCard: 1 } }
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-musterdorf-m1-2026-27', 'SV Musterdorf', 'Kreisliga A', '26/27', HERREN),
    seasons: [season('sv-musterdorf-m1-2026-27', '26/27', 7, 3, 1, 'SV Musterdorf', 'Kreisliga A', HERREN), noNumbers],
  })))
  assert.equal(p.league, 'Kreisliga A')
  assert.deepEqual(p.stats, { season: '26/27', games: 7, goals: 3, assists: 1, team: 'SV Musterdorf', league: 'Kreisliga A', career: { games: 7, goals: 3, assists: 1, seasons: 1 } })
})

test('league guard of #7 with a youth row: no league on the U19 row falls back to the club competition', () => {
  const p = plain(parseFupaHtml(page({
    currentTeam: teamOf('sv-musterdorf-m1-2026-27', 'SV Musterdorf', 'Kreisliga A', '26/27', HERREN),
    seasons: [
      season('sv-musterdorf-m1-2026-27', '26/27', 2, 0, 0, 'SV Musterdorf', 'Kreisliga A', HERREN),
      { id: 'u', team: { slug: 'sv-musterdorf-u19-1-2026-27', name: { full: 'SV Musterdorf' }, ageGroup: U19 }, statistics: { matches: 6, goals: 1, assists: 0 } },
    ],
  })))
  assert.equal(p.league, 'Kreisliga A')
  assert.equal(p.stats.games, 6)
  assert.equal(p.stats.league, null)
})
