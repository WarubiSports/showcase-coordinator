// The Tests page by station (Max, 30.10.2026: one long card per player meant scrolling up and down the whole page).
// Each station shows only its own fields, one short row per player, and the search box jumps to a shirt number.
// Dependency-free (type imports only) so node --test loads it directly.
import type { SelectionTestPlayer, TestKey } from './selection-tests'

export const STATIONS = [
  { key: 'sprint', label: 'Sprint' },
  { key: 'agility', label: 'Agility' },
  { key: 'broad_jump', label: 'Weitsprung' },
  { key: 'evaluation', label: 'Bewertung' },
] as const

export type Station = (typeof STATIONS)[number]['key']
export type TestStation = Exclude<Station, 'evaluation'>

const STATION_TESTS: Record<TestStation, TestKey[]> = {
  sprint: ['sprint_5m', 'sprint_20m', 'sprint_30m', 'sprint_40yd'],
  agility: ['agility'],
  broad_jump: ['broad_jump'],
}

export const isStation = (v: unknown): v is Station => STATIONS.some((s) => s.key === v)

// A player counts at a station once any of its fields holds a value
export const hasStationValue = (player: SelectionTestPlayer, station: TestStation): boolean =>
  STATION_TESTS[station].some((k) => player[`${k}_1`] !== null || player[`${k}_2`] !== null)

// The search box: digits (with or without "#") match the shirt number exactly, so "7" finds #7 and not #17;
// anything else matches part of the name
export const matchesSearch = (player: { name: string; jersey_number: number | null }, query: string): boolean => {
  const q = query.trim().replace(/^#\s*/, '')
  if (!q) return true
  if (/^\d+$/.test(q)) return player.jersey_number === Number(q)
  return player.name.toLocaleLowerCase('de').includes(q.toLocaleLowerCase('de'))
}
