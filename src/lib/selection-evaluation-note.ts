import {
  RATING_KEYS, TEXT_LIMITS, isFit, isObject, isOutcome, isRating,
  type Evaluation, type EvaluationInput,
} from './selection-evaluation'

// A staff evaluation on its way into itp.scouting_event_notes and back: the writer's name, the checked request, the
// stored note in Hamburg's full shape, and a stored note read back for the page. Server side (the route) and tests.

const TEXT_KEYS = Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]
const INPUT_KEYS = [...TEXT_KEYS, 'ratings', 'manualOutcome', 'footballCollegeFit']
const BODY_KEYS = ['eventId', 'playerId', 'expectedVersion', 'note']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const exactKeys = (v: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(v).length === keys.length && Object.keys(v).every((k) => keys.includes(k))

// The writer's name comes from the Staff App login only, never from the request body
export const scoutNameOf = (staff: { full_name: string | null; email: string | null } | null): string | null => {
  const name = (staff?.full_name?.trim() || staff?.email?.trim() || '').slice(0, 80)
  return name || null
}

export type EvaluationRequest = { eventId: string; playerId: string; expectedVersion: number; note: EvaluationInput }

// A save request: exactly these keys, enums and 1-5 ratings checked, text capped. Returns a German error otherwise.
export const parseEvaluationRequest = (input: unknown): EvaluationRequest | { error: string } => {
  if (!isObject(input) || !exactKeys(input, BODY_KEYS)) return { error: 'Ungültige Anfrage' }
  const { eventId, playerId, expectedVersion, note } = input
  if (typeof eventId !== 'string' || !UUID.test(eventId) || typeof playerId !== 'string' || !UUID.test(playerId)) {
    return { error: 'eventId und playerId fehlen' }
  }
  if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) return { error: 'Ungültige Version' }
  if (!isObject(note) || !exactKeys(note, INPUT_KEYS)) return { error: 'Ungültige Bewertung' }
  const ratings = note.ratings
  if (!isObject(ratings) || !exactKeys(ratings, RATING_KEYS) || !RATING_KEYS.every((k) => isRating(ratings[k]))) {
    return { error: 'Bewertungen gehen nur von 1 bis 5' }
  }
  if (!isOutcome(note.manualOutcome)) return { error: 'Ungültige Einschätzung' }
  if (!isFit(note.footballCollegeFit)) return { error: 'Ungültige Angabe zum College-Fußball-Niveau' }
  for (const key of TEXT_KEYS) {
    const v = note[key]
    if (typeof v !== 'string') return { error: 'Ungültige Bewertung' }
    if (v.length > TEXT_LIMITS[key]) return { error: `Text zu lang (höchstens ${TEXT_LIMITS[key]} Zeichen)` }
  }
  return {
    eventId,
    playerId,
    expectedVersion: expectedVersion as number,
    note: {
      observedPosition: (note.observedPosition as string).trim(),
      ratings: Object.fromEntries(RATING_KEYS.map((k) => [k, ratings[k]])) as EvaluationInput['ratings'],
      positive: (note.positive as string).trim(),
      developmentPoint: (note.developmentPoint as string).trim(),
      rawVoice: (note.rawVoice as string).trim(),
      manualOutcome: note.manualOutcome,
      footballCollegeFit: note.footballCollegeFit,
    },
  }
}

// The stored note: Hamburg's complete key set, the fields this page does not ask for at Hamburg's defaults
export const toStoredNote = (input: EvaluationInput, observedAt: string) => ({
  attendance: '', jersey: '', group: '',
  observedPosition: input.observedPosition,
  ratings: input.ratings,
  positive: input.positive,
  developmentPoint: input.developmentPoint,
  rawVoice: input.rawVoice,
  evidenceConfidence: 'brief', nextEvidence: 'none', internalNextAction: 'no_current_action',
  manualOutcome: input.manualOutcome,
  footballCollegeFit: input.footballCollegeFit,
  academicCurrentGrade: '', academicQualification: '', academicGraduationYear: '',
  footageReviewed: false,
  observedAt,
})

const validTime = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v))

// A stored note as the page shows it; anything missing or malformed reads as empty
export const readStoredNote = (raw: unknown): Evaluation => {
  const n = isObject(raw) ? raw : {}
  const r = isObject(n.ratings) ? n.ratings : {}
  const text = (k: keyof typeof TEXT_LIMITS) => (typeof n[k] === 'string' ? (n[k] as string).slice(0, TEXT_LIMITS[k]) : '')
  return {
    observedPosition: text('observedPosition'),
    ratings: Object.fromEntries(RATING_KEYS.map((k) => [k, isRating(r[k]) ? (r[k] as number | null) : null])) as EvaluationInput['ratings'],
    positive: text('positive'),
    developmentPoint: text('developmentPoint'),
    rawVoice: text('rawVoice'),
    manualOutcome: isOutcome(n.manualOutcome) ? n.manualOutcome : 'no_outcome',
    footballCollegeFit: isFit(n.footballCollegeFit) ? n.footballCollegeFit : '',
    observedAt: validTime(n.observedAt) ? n.observedAt : '',
  }
}

// When the player was first evaluated by this writer: kept from the stored note, else now
export const observedAtFor = (stored: unknown, now: string): string => {
  const at = isObject(stored) ? stored.observedAt : null
  return validTime(at) ? at : now
}
