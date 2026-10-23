import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'

// The event card helpers, with the real 30.10 event text shape
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, module: { exports }, URL, encodeURIComponent, require(name) { if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected dependency of ${path}: ${name}`); return imports[name] } }, { filename: path })
  return exports
}
const germanDate = load('../src/lib/german-date.ts', {})
const message = load('../src/lib/invite-message.ts', { '@/lib/german-date': germanDate })
const og = load('../src/lib/invite-og.ts', { '@/lib/german-date': germanDate })
const eventPage = load('../src/lib/event-page.ts', { '@/lib/german-date': germanDate, '@/lib/invite-og': og })
const facts = load('../src/lib/event-facts.ts', { '@/lib/invite-message': message, '@/lib/german-date': germanDate, '@/lib/event-page': eventPage })
const description = 'Auswahlspiel der Athletes USA Selection gegen das ITP. Treffpunkt 10:30 Uhr an der LöWi Arena, Anpfiff 12:00 Uhr.'

test('Treffpunkt: its own row, and the description loses that sentence', () => {
  assert.equal(facts.treffpunktLine(description), 'Treffpunkt 10:30 Uhr an der LöWi Arena')
  assert.equal(facts.descriptionWithoutTreffpunkt(description), 'Auswahlspiel der Athletes USA Selection gegen das ITP.')
  assert.equal(facts.treffpunktLine('808 Futbol Club showcase, boys day.'), null)
  assert.equal(facts.descriptionWithoutTreffpunkt('808 Futbol Club showcase, boys day.'), '808 Futbol Club showcase, boys day.')
  assert.equal(facts.descriptionWithoutTreffpunkt('Treffpunkt 10:30 Uhr am Haupteingang.'), null, 'nothing left: no description paragraph')
  assert.equal(facts.descriptionWithoutTreffpunkt(null), null)
})

test('maps link: coordinates when the event has them, else the address; nothing without either', () => {
  assert.equal(facts.mapsUrl({ location: 'LöWi Arena, Neue Sandkaul 21, 50859 Köln-Widdersdorf', venue_lat: null, venue_lng: null }), 'https://www.google.com/maps/search/?api=1&query=L%C3%B6Wi%20Arena%2C%20Neue%20Sandkaul%2021%2C%2050859%20K%C3%B6ln-Widdersdorf')
  assert.equal(facts.mapsUrl({ location: 'Waipio Peninsula Soccer Park', venue_lat: '21.3721819', venue_lng: '-157.9966806' }), 'https://www.google.com/maps/search/?api=1&query=21.3721819,-157.9966806')
  assert.equal(facts.mapsUrl({ location: '  ', venue_lat: null, venue_lng: null }), null)
})
