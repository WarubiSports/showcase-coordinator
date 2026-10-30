import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as stations from '../src/lib/test-stations.ts'
import { TEST_FIELDS } from '../src/lib/selection-tests.ts'

// The Tests page by station (30.10.2026): the shirt-number search and the per-station progress

const player = (overrides = {}) => ({
  id: 'p1', name: 'Jonas Müller', position: 'ZM', jersey_number: 7,
  ...Object.fromEntries(TEST_FIELDS.map((f) => [f, null])),
  ...overrides,
})

test('digits match the shirt number exactly, with or without #', () => {
  assert.equal(stations.matchesSearch(player(), '7'), true)
  assert.equal(stations.matchesSearch(player(), '#7'), true)
  assert.equal(stations.matchesSearch(player(), ' # 7 '), true)
  assert.equal(stations.matchesSearch(player({ jersey_number: 17 }), '7'), false)
  assert.equal(stations.matchesSearch(player({ jersey_number: 7 }), '17'), false)
  assert.equal(stations.matchesSearch(player({ jersey_number: null }), '7'), false)
})

test('text matches part of the name, case and umlauts as typed', () => {
  assert.equal(stations.matchesSearch(player(), 'mül'), true)
  assert.equal(stations.matchesSearch(player(), 'JONAS'), true)
  assert.equal(stations.matchesSearch(player(), 'Schmidt'), false)
})

test('an empty search shows everyone', () => {
  assert.equal(stations.matchesSearch(player(), ''), true)
  assert.equal(stations.matchesSearch(player(), '   '), true)
})

test('a station counts once any of its own fields holds a value, never another station\'s', () => {
  assert.equal(stations.hasStationValue(player(), 'sprint'), false)
  assert.equal(stations.hasStationValue(player({ sprint_40yd_2: 5.1 }), 'sprint'), true)
  assert.equal(stations.hasStationValue(player({ sprint_40yd_2: 5.1 }), 'agility'), false)
  assert.equal(stations.hasStationValue(player({ agility_1: 2.4 }), 'agility'), true)
  assert.equal(stations.hasStationValue(player({ broad_jump_2: 230 }), 'broad_jump'), true)
  assert.equal(stations.hasStationValue(player({ broad_jump_2: 230 }), 'sprint'), false)
})

test('the sprint station covers every sprint split the tests know', () => {
  const sprintFields = TEST_FIELDS.filter((f) => f.startsWith('sprint_'))
  for (const f of sprintFields) assert.equal(stations.hasStationValue(player({ [f]: 3 }), 'sprint'), true, f)
})

test('only the four stations are accepted from storage', () => {
  for (const s of ['sprint', 'agility', 'broad_jump', 'evaluation']) assert.equal(stations.isStation(s), true)
  for (const s of [null, '', 'Sprint', 'tests', 1]) assert.equal(stations.isStation(s), false)
})
