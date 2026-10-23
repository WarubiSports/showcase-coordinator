import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as germanDate from '../src/lib/german-date.ts'

function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const og = load('../src/lib/invite-og.ts', { '@/lib/german-date': germanDate })

// The WhatsApp preview texts, with the real 30.10 event row shape
const event = { start_date: '2026-10-30', start_time: '12:00:00', location: 'LöWi Arena, Neue Sandkaul 21, 50859 Köln-Widdersdorf' }

test('venue and town without the street, with or without a comma', () => {
  assert.equal(og.shortVenue(event.location), 'LöWi Arena, Köln-Widdersdorf')
  assert.equal(og.shortVenue(event.location, ' '), 'LöWi Arena Köln-Widdersdorf')
  assert.equal(og.shortVenue('Sportpark Höhenberg'), 'Sportpark Höhenberg')
  assert.equal(og.shortVenue(null), '')
})

test('personal preview: first name in the title and the headline, initials for the fallback, the date line short', () => {
  const m = og.inviteOgModel({ name: 'Timo Testspieler', status: 'invited' }, event)
  assert.equal(m.personal, true)
  assert.equal(m.headline, 'Du bist eingeladen, Timo')
  assert.equal(m.initials, 'TT')
  assert.equal(m.dateLine, 'Fr 30.10.2026 · 12:00 Uhr · LöWi Arena, Köln-Widdersdorf')
  assert.equal(og.ogTitle(m.firstName), 'Timo, du bist eingeladen: Athletes USA Auswahl vs. 1. FC Köln ITP')
  assert.equal(og.ogDescription(event), 'Fr 30.10. · 12:00 Uhr · LöWi Arena Köln-Widdersdorf · Das Spiel wird mit Veo gefilmt, deine Clips fürs Profil')
  assert.equal(og.inviteOgModel({ name: 'Timo Testspieler', status: 'accepted' }, event).personal, true, 'an accepted invite keeps the personal preview')
})

test('neutral preview for an invalid or declined link: no name, no initials', () => {
  for (const invite of [null, { name: 'Timo Testspieler', status: 'declined' }]) {
    const m = og.inviteOgModel(invite, event)
    assert.equal(m.personal, false)
    assert.equal(m.firstName, null)
    assert.equal(m.initials, null)
    assert.equal(m.headline, 'Du bist eingeladen')
  }
  assert.equal(og.ogTitle(null), 'Deine Einladung: Athletes USA Auswahl vs. 1. FC Köln ITP')
  assert.equal(og.ogDescription(null), 'Das Spiel wird mit Veo gefilmt, deine Clips fürs Profil')
  assert.equal(og.inviteOgModel(null, null).dateLine, '')
})

test('no em or en dashes in any preview text', () => {
  const m = og.inviteOgModel({ name: 'Timo Testspieler', status: 'invited' }, event)
  for (const s of [m.headline, m.dateLine, og.ogTitle('Timo'), og.ogDescription(event), og.MATCH_LINE, og.VEO_LINE]) assert.doesNotMatch(s, /[–—]/)
})
