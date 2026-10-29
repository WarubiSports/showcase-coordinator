// Pitch-side tests of a selection game (Max, 29.10.2026): sprint splits at 5, 10, 20, 30 m and 40 yd, an agility
// run and the broad jump, two attempts each, stored on the sign-up (showcase_players). Dependency-free so the
// route, the page and node --test share one list of fields and one set of limits.

export const SPRINT_SPLITS = [
  { key: 'sprint_5m', label: '5 m' },
  { key: 'sprint_10m', label: '10 m' },
  { key: 'sprint_20m', label: '20 m' },
  { key: 'sprint_30m', label: '30 m' },
  { key: 'sprint_40yd', label: '40 yd' },
] as const

export type TestKey = (typeof SPRINT_SPLITS)[number]['key'] | 'agility' | 'broad_jump'
export type TestField = `${TestKey}_${1 | 2}`

interface TestSpec {
  label: string
  unit: 's' | 'cm'
  min: number
  max: number
  // times: the lower attempt counts; the jump: the longer one
  lowerIsBetter: boolean
}

const time = (label: string, max: number): TestSpec => ({ label, unit: 's', min: 0.5, max, lowerIsBetter: true })

// Plausibility limits, wide enough for any real attempt and tight enough to catch a slipped digit. Agility is the
// 5-0-5 (ITP records agility only as agility_505), with a generous 30 s limit; broad jump is in cm, the unit of
// the /players screen.
export const TESTS: Record<TestKey, TestSpec> = {
  sprint_5m: time('Sprint 5 m', 15),
  sprint_10m: time('Sprint 10 m', 15),
  sprint_20m: time('Sprint 20 m', 15),
  sprint_30m: time('Sprint 30 m', 15),
  sprint_40yd: time('Sprint 40 yd', 10),
  agility: time('Agility (5-0-5)', 30),
  broad_jump: { label: 'Weitsprung', unit: 'cm', min: 50, max: 400, lowerIsBetter: false },
}

const TEST_KEYS = Object.keys(TESTS) as TestKey[]
export const TEST_FIELDS: TestField[] = TEST_KEYS.flatMap((k) => [`${k}_1`, `${k}_2`] as TestField[])

export type SelectionTestPlayer = {
  id: string
  name: string
  position: string | null
  jersey_number: number | null
} & Record<TestField, number | null>

const keyOf = (field: TestField) => field.slice(0, -2) as TestKey
const isTestField = (v: string): v is TestField => (TEST_FIELDS as string[]).includes(v)

// German decimal comma for display, at most 3 decimals; the inputs take comma or dot
export const formatScore = (n: number | null): string =>
  n === null ? '' : String(Math.round(n * 1000) / 1000).replace('.', ',')

export const fieldLabel = (field: TestField): string => `${TESTS[keyOf(field)].label}, Versuch ${field.slice(-1)}`

// What a tester typed: empty clears, "4,52" and "4.52" both read as 4.52, anything else is refused
export const parseScoreText = (text: string): { value: number | null } | { error: string } => {
  const t = text.trim().replace(',', '.')
  if (!t) return { value: null }
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return { error: 'Bitte nur eine Zahl eingeben, z. B. 4,52' }
  return { value: Number(t) }
}

// null clears; a number must sit inside the test's limits. Returns the German error, or null when fine.
export const validateScore = (field: TestField, value: unknown): string | null => {
  if (value === null) return null
  const { label, unit, min, max } = TESTS[keyOf(field)]
  const range = `zwischen ${formatScore(min)} und ${formatScore(max)} ${unit}`
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    return `${label}: bitte einen Wert ${range} eingeben`
  }
  return null
}

// A save request's values: only the test columns, each a plausible number or null. Never any other column.
export const parseTestValues = (input: unknown): { values: Partial<Record<TestField, number | null>> } | { error: string } => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { error: 'Keine Werte zum Speichern' }
  const entries = Object.entries(input)
  if (entries.length === 0 || entries.length > TEST_FIELDS.length) return { error: 'Keine Werte zum Speichern' }
  const values: Partial<Record<TestField, number | null>> = {}
  for (const [field, value] of entries) {
    if (!isTestField(field)) return { error: `Unbekanntes Feld: ${field.slice(0, 40)}` }
    const problem = validateScore(field, value)
    if (problem) return { error: problem }
    values[field] = value as number | null
  }
  return { values }
}

export function getBest(val1: number | null, val2: number | null, lowerIsBetter = false): number | null {
  if (val1 === null && val2 === null) return null
  if (val1 === null) return val2
  if (val2 === null) return val1
  return lowerIsBetter ? Math.min(val1, val2) : Math.max(val1, val2)
}

export const bestOf = (player: SelectionTestPlayer, key: TestKey): number | null =>
  getBest(player[`${key}_1`], player[`${key}_2`], TESTS[key].lowerIsBetter)

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// A showcase_players row as the page uses it; test columns the row lacks (migration pending) read as null
export const toTestPlayer = (row: Record<string, unknown>): SelectionTestPlayer => ({
  id: String(row.id),
  name: typeof row.name === 'string' ? row.name : '',
  position: typeof row.position === 'string' ? row.position : null,
  jersey_number: toNumber(row.jersey_number),
  ...(Object.fromEntries(TEST_FIELDS.map((f) => [f, toNumber(row[f])])) as Record<TestField, number | null>),
})

// Shirt numbers first (lowest to highest), then the players without a number, each group by name
export const sortRoster = <T extends { jersey_number: number | null; name: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => {
    if (a.jersey_number !== b.jersey_number) {
      if (a.jersey_number === null) return 1
      if (b.jersey_number === null) return -1
      return a.jersey_number - b.jersey_number
    }
    return a.name.localeCompare(b.name, 'de')
  })

// The database error of a read or write naming one of the new columns: 20261029000001 is not applied yet
export const isTestsMigrationPending = (message: string | undefined): boolean =>
  !!message && /\b(sprint_(5m|10m|20m|30m|40yd)|agility)_[12]\b/.test(message)
