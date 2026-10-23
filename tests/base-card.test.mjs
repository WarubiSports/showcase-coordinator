import assert from 'node:assert/strict'
import * as cardLines from '../src/lib/card-lines.ts'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as profileUrl from '../src/lib/profile-url.ts'
import { enrichUpdate } from '../src/lib/invite-enrich.ts'

// Runs the real modules with the app's own storage host set; no database, no network.
const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://core-fixture.supabase.co' }
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, module: { exports }, URL, process: { env },
    require(name) {
      if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`)
      return imports[name]
    },
  }, { filename: path })
  return exports
}
// Objects built inside the vm carry another realm's prototypes; compare their plain JSON shape
const plain = (v) => JSON.parse(JSON.stringify(v))
const photoUrl = load('../src/lib/photo-url.ts', {})
const baseAthletes = load('../src/lib/base-athletes.ts', { '@/lib/profile-url': profileUrl, '@/lib/photo-url': photoUrl })
const baseInvite = load('../src/lib/base-invite.ts', { '@/lib/base-athletes': baseAthletes })

// Fake athlete rows only
const athlete = (over = {}) => ({
  id: '00000000-0000-4000-8000-0000000000aa', full_name: 'Timo Testspieler', first_name: 'Timo', last_name: 'Testspieler', date_of_birth: '2008-03-01',
  teams: 'SV Beispielhausen', position_primary: 'RW, LW, ST', position_soccer: null, schulabschluss_typ: 'Abitur', abitur_year: 2027, schulabschluss_datum: null,
  graduation_date: null, gpa_overall: 2.1, english_level: 'Gut', highlight_video_url: null, home_statistics_url: 'https://www.fupa.net/player/timo-testspieler-1',
  transfermarkt_url: 'https://www.transfermarkt.de/timo-testspieler/profil/spieler/1', phone: null, parent_first_name: null, parent_last_name: null, parent_phone: null,
  profile_picture_url: 'https://core-fixture.supabase.co/storage/v1/object/public/athletes/timo.jpg', photo_url: null, unified_stage: 'Recruit Ready', ...over,
})

test('link preference: Base FuPa page first, Transfermarkt second, a college stats site never', () => {
  assert.equal(baseAthletes.toPrefill(athlete()).profile_url, 'https://www.fupa.net/player/timo-testspieler-1')
  assert.equal(baseAthletes.toPrefill(athlete({ home_statistics_url: 'https://kwucoyotes.com/sports/msoc/roster/timo' })).profile_url, 'https://www.transfermarkt.de/timo-testspieler/profil/spieler/1')
  assert.equal(baseAthletes.toPrefill(athlete({ home_statistics_url: null, transfermarkt_url: null })).profile_url, null)
  assert.ok(!baseAthletes.ATHLETE_COLUMNS.split(/,\s*/).includes('profile_url'), 'athletes.profile_url (the profiles.athletesusa.org page) is not read')
})

test('photo hosts: own storage, image.fupa.net and athletesusa.org over https; nothing else', () => {
  assert.equal(photoUrl.safeBasePhotoUrl('https://core-fixture.supabase.co/storage/v1/object/public/athletes/timo.jpg'), 'https://core-fixture.supabase.co/storage/v1/object/public/athletes/timo.jpg')
  assert.equal(photoUrl.safeBasePhotoUrl('https://image.fupa.net/player/abc/960x1200.jpeg'), 'https://image.fupa.net/player/abc/960x1200.jpeg')
  assert.equal(photoUrl.safeBasePhotoUrl('https://profiles.athletesusa.org/photos/timo.jpg'), 'https://profiles.athletesusa.org/photos/timo.jpg')
  assert.equal(photoUrl.safeBasePhotoUrl('https://other-project.supabase.co/storage/v1/object/public/x.jpg'), null)
  assert.equal(photoUrl.safeBasePhotoUrl('https://montevallofalcons.com/images/timo.jpg'), null)
  assert.equal(photoUrl.safeBasePhotoUrl('http://core-fixture.supabase.co/storage/v1/object/public/x.jpg'), null)
  assert.equal(baseAthletes.toPrefill(athlete({ profile_picture_url: 'https://montevallofalcons.com/x.jpg', photo_url: 'https://image.fupa.net/p/1.jpeg' })).photo_url, 'https://image.fupa.net/p/1.jpeg')
})

test('prefill guards: a club that is a URL, a path or overlong is dropped; year and type never cross', () => {
  assert.equal(baseAthletes.toPrefill(athlete({ teams: 'https://naiastats.prestosports.com/sports/msoc/2025-26/teams/example' })).club, null)
  assert.equal(baseAthletes.toPrefill(athlete({ teams: 'SV Beispielhausen / U19' })).club, null)
  assert.equal(baseAthletes.toPrefill(athlete({ teams: 'x'.repeat(61) })).club, null)
  assert.equal(baseAthletes.toPrefill(athlete({ teams: '  SV Beispielhausen  ' })).club, 'SV Beispielhausen')
  const p = baseAthletes.toPrefill(athlete({ schulabschluss_typ: null, abitur_year: null, schulabschluss_datum: null, graduation_date: '2018-06-30' }))
  assert.equal(p.school_type, null, 'a graduation date says nothing about the type')
  assert.equal(p.grad_year, 2018)
  const q = baseAthletes.toPrefill(athlete({ schulabschluss_typ: 'Abitur', abitur_year: null, schulabschluss_datum: null, graduation_date: null }))
  assert.equal(q.school_type, 'abitur')
  assert.equal(q.grad_year, null, 'a type says nothing about the year')
})

test('positions: a list like "RW, LW, ST" or "CDM, CM" maps to its first known entry', () => {
  assert.equal(baseAthletes.mapPosition('RW, LW, ST'), 'RW')
  assert.equal(baseAthletes.mapPosition('CDM, CM'), 'CDM')
  assert.equal(baseAthletes.mapPosition('Winger'), null)
  assert.equal(baseAthletes.mapPosition('Striker'), 'ST')
})

test('invite fields from Base: staff link wins, Base link otherwise; only known values are written', () => {
  const f = plain(baseInvite.baseInviteFields(athlete(), null))
  assert.deepEqual(f, { profile_url: 'https://www.fupa.net/player/timo-testspieler-1', photo_url: 'https://core-fixture.supabase.co/storage/v1/object/public/athletes/timo.jpg', club: 'SV Beispielhausen', position: 'RW' })
  assert.equal(baseInvite.baseInviteFields(athlete(), 'https://www.transfermarkt.de/x/profil/spieler/9').profile_url, 'https://www.transfermarkt.de/x/profil/spieler/9')
  const sparse = plain(baseInvite.definedFields(baseInvite.baseInviteFields(athlete({ home_statistics_url: null, transfermarkt_url: null, profile_picture_url: null, position_primary: 'Winger' }), null)))
  assert.deepEqual(sparse, { club: 'SV Beispielhausen' })
})

test('position precedence: Base position stays over the FuPa read; FuPa fills only a gap', () => {
  const current = { photo_url: null, club: 'SV Beispielhausen', position: 'RW' }
  const profile = { photo_url: null, club: 'SV Beispielhausen', league: 'Kreisliga A', position: 'Mittelfeld', stats: null }
  assert.equal(enrichUpdate({ ok: true, profile, source: 'direct' }, current, '2026-10-23T12:00:00Z', 'RW').position, 'RW', 'Base-linked with a Base position: Base wins')
  assert.equal(enrichUpdate({ ok: true, profile, source: 'direct' }, current, '2026-10-23T12:00:00Z', null).position, 'Mittelfeld', 'no Base position: FuPa fills it')
  assert.equal(enrichUpdate({ ok: true, profile: { ...profile, position: null }, source: 'direct' }, current, '2026-10-23T12:00:00Z', null).position, 'RW', 'FuPa has none: the stored value stays')
})

test('FuPa read: a failure writes nothing; a success keeps the Base photo when FuPa has none', () => {
  const current = { photo_url: 'https://core-fixture.supabase.co/a.jpg', club: 'SV Beispielhausen', position: 'RW' }
  assert.equal(enrichUpdate({ ok: false, reason: 'unreachable' }, current, '2026-10-23T12:00:00Z'), null)
  const profile = { photo_url: null, club: 'SV Beispielhausen II', league: 'Kreisliga A', position: 'Sturm', stats: { season: '26/27', games: 7, goals: 3, assists: 1, team: 'SV Beispielhausen II', league: 'Kreisliga A' } }
  const u = enrichUpdate({ ok: true, profile, source: 'direct' }, current, '2026-10-23T12:00:00Z')
  assert.equal(u.photo_url, current.photo_url)
  assert.equal(u.club, 'SV Beispielhausen II')
  assert.equal(u.position, 'Sturm')
  assert.equal(u.league, 'Kreisliga A')
  assert.equal(u.enriched_at, '2026-10-23T12:00:00Z')
})

test('card lines: a count of 0 is left out, no games means no line', () => {
  // Benjamin's live card read "3 Spiele · 2 Tore · 0 Vorlagen"; the zero goes
  assert.equal(cardLines.seasonLine({ season: '26/27', games: 3, goals: 2, assists: 0 }), 'Saison 26/27 · 3 Spiele · 2 Tore')
  assert.equal(cardLines.seasonLine({ season: '26/27', games: 1, goals: 0, assists: 1 }), 'Saison 26/27 · 1 Spiel · 1 Vorlage')
  assert.equal(cardLines.seasonLine({ season: '26/27', games: 0, goals: 0, assists: 0 }), null, 'no games, no season line')
  assert.equal(cardLines.seasonLine(null), null)
  assert.equal(cardLines.careerLine({ games: 95, goals: 30, assists: 0 }), 'Karriere: 95 Spiele · 30 Tore')
  assert.equal(cardLines.careerLine({ games: 0, goals: 0, assists: 0 }), null)
  assert.equal(cardLines.careerLine(undefined), null)
})
