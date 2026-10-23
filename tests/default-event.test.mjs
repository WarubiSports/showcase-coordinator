import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultEvent, isTemplateEvent } from '../src/lib/default-event.ts'

// Which event a browser with no saved selection lands on. Rows come ordered by start_date descending, as the
// event context fetches them; the template sorts first there, which is the bug this guards against.
const ev = (slug, start_date, end_date) => ({ slug, start_date, end_date })
const template = ev('template-showcase', '2099-01-01', '2099-01-02')
const game = ev('athletes-usa-selection-2026', '2026-10-30', '2026-10-30')
const camp = ev('winter-camp-2026', '2026-12-10', '2026-12-12')
const past = ev('cologne-showcase-2026', '2026-05-02', '2026-05-03')
const older = ev('shark-showcase-2025', '2025-11-20', '2025-11-21')

test('template events are recognised by slug only', () => {
  assert.equal(isTemplateEvent(template), true)
  assert.equal(isTemplateEvent(game), false)
})

test('nearest upcoming real event wins over the template and over later events', () => {
  assert.equal(defaultEvent([template, camp, game, past, older], '2026-10-23'), game)
})

test('an event running today still counts as upcoming', () => {
  assert.equal(defaultEvent([template, game, past], '2026-10-30'), game)
})

test('nothing upcoming: the most recent past event, never the template', () => {
  assert.equal(defaultEvent([template, past, older], '2026-10-23'), past)
})

test('only a template: it stays the pick so the app has an event; no events: null', () => {
  assert.equal(defaultEvent([template], '2026-10-23'), template)
  assert.equal(defaultEvent([], '2026-10-23'), null)
})
