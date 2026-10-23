import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as germanDate from '../src/lib/german-date.ts'

// The event-first player page: hero, reasons, reel link and the facts card under the hero
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const og = load('../src/lib/invite-og.ts', { '@/lib/german-date': germanDate })
const page = load('../src/lib/event-page.ts', { '@/lib/german-date': germanDate, '@/lib/invite-og': og })
const message = load('../src/lib/invite-message.ts', { '@/lib/german-date': germanDate })
const facts = load('../src/lib/event-facts.ts', { '@/lib/invite-message': message, '@/lib/german-date': germanDate, '@/lib/event-page': page })
const plain = (v) => JSON.parse(JSON.stringify(v))

const event = { name: 'Athletes USA Auswahl vs. 1. FC Köln ITP', slug: 'ausa-selection-2026-10-30', start_date: '2026-10-30', end_date: '2026-10-30', start_time: '12:00:00', end_time: '14:00:00', location: 'LöWi Arena, Neue Sandkaul 21, 50859 Köln-Widdersdorf', description: 'Auswahlspiel der Athletes USA Auswahl gegen das ITP. Treffpunkt 10:30 Uhr an der LöWi Arena, Anpfiff 12:00 Uhr.' }

test('hero: the photo when public/events/<slug>/hero.jpg exists, the placeholder otherwise', () => {
  assert.equal(page.heroUrlFor(event.slug, (p) => p === 'events/ausa-selection-2026-10-30/hero.jpg'), '/events/ausa-selection-2026-10-30/hero.jpg')
  assert.equal(page.heroUrlFor(event.slug, () => false), null, 'no file: placeholder')
  assert.equal(page.heroUrlFor('../etc', () => true), null, 'a slug that is not a slug never reaches the disk')
  assert.equal(page.heroUrlFor(null, () => true), null)
  assert.equal(page.heroDateLine(event), 'Fr 30.10.2026 · 12:00 Uhr · LöWi Arena, Köln-Widdersdorf')
})

test('reasons: three lines, as approved, without em or en dashes', () => {
  assert.equal(page.REASONS.length, 3)
  assert.deepEqual(plain(page.REASONS), [
    'Du spielst gegen das 1. FC Köln International Talent Program',
    'Das Spiel wird mit Veo gefilmt, du bekommst deine Szenen fürs Profil',
    'Athletes USA schaut zu: Sichtung für US-College-Programme',
  ])
  for (const r of page.REASONS) assert.doesNotMatch(r, /[–—]/)
})

test('facts card under the hero: no title, no date line a second time; on its own it keeps both', () => {
  const under = plain(facts.eventFactsModel(event, { hero: true }))
  assert.equal(under.title, null)
  assert.equal(under.date, null, 'the hero already shows the date')
  assert.equal(under.treffpunkt, 'Treffpunkt 10:30 Uhr an der LöWi Arena')
  assert.equal(under.time, 'Anpfiff 12:00 Uhr · Ende 14:00 Uhr')
  assert.equal(under.description, 'Auswahlspiel der Athletes USA Auswahl gegen das ITP.')
  const alone = plain(facts.eventFactsModel(event))
  assert.equal(alone.title, event.name)
  assert.equal(alone.date, 'Freitag, 30.10.2026')
})

test('"Video:" line: parsed only at the start of its own line with an https URL, and kept out of the description', () => {
  const withVideo = { ...event, description: event.description + '\nVideo: https://www.youtube.com/watch?v=abc123' }
  assert.equal(page.videoLink(withVideo.description), 'https://www.youtube.com/watch?v=abc123')
  assert.equal(page.videoLink('Video: http://example.test/clip'), null, 'http is not enough')
  assert.equal(page.videoLink('Schau das Video: https://example.test/clip an'), null, 'not at the start of a line')
  assert.equal(page.videoLink('video: https://example.test/clip'), 'https://example.test/clip', 'case does not matter')
  assert.equal(page.videoLink(event.description), null)
  assert.equal(page.videoLink(null), null)
  assert.equal(plain(facts.eventFactsModel(withVideo, { hero: true })).description, 'Auswahlspiel der Athletes USA Auswahl gegen das ITP.', 'the link line never shows as text')
  assert.equal(page.descriptionWithoutVideo('Video: https://example.test/clip'), null)
})
