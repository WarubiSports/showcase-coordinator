import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as profileUrl from '../src/lib/profile-url.ts'
import * as inviteTypes from '../src/components/invite/invite-types.ts'

const { initialAcceptForm } = inviteTypes

// The signed player's confirm step against the real server-side validation. No network, no database.
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, URL, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const accept = load('../src/lib/invite-accept.ts', { '@/lib/profile-url': profileUrl })
const signed = load('../src/components/invite/signed-fields.ts', { '@/lib/invite-accept': accept, '@/components/invite/invite-types': inviteTypes })
const EVENT_YEAR = 2026
// Arrays built inside the vm carry another realm's prototype; compare their plain shape
const plain = (v) => JSON.parse(JSON.stringify(v))

// Fake player, 17 at the event (2009; 2008 would be the turning-18 year and get the extra question).
// The Base prefill as the token route returns it for a signed, linked invite.
const prefill = (over = {}) => ({
  name: 'Timo Testspieler', birth_year: 2009, position: 'RW', club: 'SV Beispielhausen', school_type: 'abitur', grad_year: 2027, grades: '2,1', english_level: 'Gut',
  video_url: null, profile_url: 'https://www.fupa.net/player/timo-testspieler-1', phone: '0151 00000001', parent_name: 'Tanja Testspieler', parent_phone: '0151 00000002', photo_url: null, ...over,
})
const payload = (p, inviteOver = {}) => ({
  invite: { id: 'a', status: 'invited', name: 'Timo Testspieler', first_name: 'Timo', phone: '0151 00000001', invited_by: 'Max', responded_at: null, profile_url: null, ausa_athlete_id: 'x', category: 'signed', photo_url: null, club: null, league: null, position: null, stats: null, enriched_at: null, ...inviteOver },
  event: { name: 'Spiel', slug: 's', start_date: '2026-10-30', end_date: '2026-10-30', start_time: null, end_time: null, location: 'Köln', description: null },
  player: null,
  base: { name: 'Timo Testspieler', photo_url: null, prefill: p },
})
// What the page sends: the form state with is_adult as a boolean, plus the consent the player gives on the page
const submission = (form, consent = { consent_profile: true, consent_parent: true, consent_name: 'Tanja Testspieler' }) => ({ ...form, ...consent, is_adult: form.is_adult === 'ja' ? true : form.is_adult === 'nein' ? false : null })

test('confirm path: a complete Base profile leaves nothing to ask, and "Stimmt so" passes server validation with the Base values', () => {
  const form = initialAcceptForm(payload(prefill()))
  assert.deepEqual(plain(signed.missingSignedFields(form, EVENT_YEAR)), [])
  assert.equal(signed.isMinorForm(form, EVENT_YEAR), true)
  const parsed = accept.parseAcceptForm(submission(form), EVENT_YEAR)
  assert.equal(parsed.ok, true, parsed.error)
  assert.equal(parsed.data.name, 'Timo Testspieler')
  assert.equal(parsed.data.birth_year, 2009)
  assert.equal(parsed.data.position, 'RW')
  assert.equal(parsed.data.school_type, 'abitur')
  assert.equal(parsed.data.grad_year, 2027)
  assert.equal(parsed.data.grades, '2,1')
  assert.equal(parsed.data.phone, '0151 00000001')
  assert.equal(parsed.data.parent_name, 'Tanja Testspieler')
  assert.equal(parsed.data.profile_url, 'https://www.fupa.net/player/timo-testspieler-1')
})

test('missing-field path: what Base could not fill (or the privacy rule withheld) is asked, and the server refuses until it is there', () => {
  // The token route strips phone, parents and grades when the invite phone is not the Base phone (PR #4)
  const stripped = payload(prefill({ phone: null, parent_name: null, parent_phone: null, grades: null }))
  stripped.invite.phone = null
  const form = initialAcceptForm(stripped)
  assert.deepEqual(plain(signed.missingSignedFields(form, EVENT_YEAR)), ['grades', 'phone', 'parent_name', 'parent_phone'])
  const refused = accept.parseAcceptForm(submission(form), EVENT_YEAR)
  assert.equal(refused.ok, false)
  assert.equal(refused.error, 'Bitte gib deinen Notenschnitt an.')
  const filled = { ...form, grades: '2,4', phone: '0151 00000009', parent_name: 'Tanja Testspieler', parent_phone: '0151 00000002' }
  assert.deepEqual(plain(signed.missingSignedFields(filled, EVENT_YEAR)), [])
  assert.equal(accept.parseAcceptForm(submission(filled), EVENT_YEAR).ok, true)
})

test('the card and the questions never overlap: a known field is shown, a missing one is asked, never both', () => {
  // Max's case: Base has the graduation year but not the type, and a stats URL where the club should be
  const form = initialAcceptForm(payload(prefill({ school_type: null, grad_year: 2018, club: null })))
  const rows = plain(signed.signedCardRows(form, EVENT_YEAR))
  assert.deepEqual(rows.map((r) => r.label), ['Geburtsjahr', 'Position', 'Abschlussjahr', 'Notenschnitt', 'Englisch', 'Handynummer', 'Elternteil'])
  assert.equal(rows.find((r) => r.label === 'Abschlussjahr').value, '2018')
  const missing = plain(signed.missingSignedFields(form, EVENT_YEAR))
  assert.deepEqual(missing, ['school_type'])
  const shown = new Set(rows.map((r) => r.field))
  assert.ok(missing.every((f) => !shown.has(f)), 'nothing asked twice')
  const full = initialAcceptForm(payload(prefill()))
  assert.deepEqual(plain(signed.signedCardRows(full, EVENT_YEAR)).map((r) => r.label), ['Geburtsjahr', 'Position', 'Verein', 'Schulabschluss', 'Abschlussjahr', 'Notenschnitt', 'Englisch', 'Handynummer', 'Elternteil'])
})

test('adults and the year someone turns 18: no parent asked, the 18 question asked once', () => {
  const adult = initialAcceptForm(payload(prefill({ birth_year: 2005, parent_name: null, parent_phone: null })))
  assert.deepEqual(plain(signed.missingSignedFields(adult, EVENT_YEAR)), [])
  const turning18 = initialAcceptForm(payload(prefill({ birth_year: 2008 })))
  assert.deepEqual(plain(signed.missingSignedFields(turning18, 2026)), ['is_adult'].filter(() => 2026 - 2008 === 18))
  assert.deepEqual(plain(signed.missingSignedFields({ ...turning18, is_adult: 'ja' }, 2026)), [])
})

test('the card opens for any Base-linked invite whose Base record covers it; sparse data or a phone mismatch opens the form', () => {
  // Neu after the portal intake (Matthew's case): name, birth year, position and phone known
  assert.equal(signed.usesConfirmCard(payload(prefill(), { category: 'new' })), true, 'category new with full Base data')
  assert.equal(signed.usesConfirmCard(payload(prefill({ school_type: null, grad_year: null, grades: null }), { category: 'new' })), true, 'school and grades may be missing, the card asks them')
  assert.equal(signed.usesConfirmCard(payload(prefill({ position: null }), { category: 'new' })), false, 'no position in Base: the form')
  assert.equal(signed.usesConfirmCard(payload(prefill({ birth_year: null }), { category: 'new' })), false, 'no birth year in Base: the form')
  assert.equal(signed.usesConfirmCard(payload(prefill())), true, 'signed as today')
  // The token route withholds phone, parent and grades when the invite phone is not Base's phone
  assert.equal(signed.usesConfirmCard(payload(prefill({ phone: null, parent_name: null, parent_phone: null, grades: null }))), false, 'phone mismatch: the form')
  assert.equal(signed.usesConfirmCard({ ...payload(prefill()), base: null }), false, 'not linked: the form')
  assert.equal(signed.usesConfirmCard(payload(prefill(), { status: 'accepted' })), false, 'editing after the answer: the form')
})
