// Staff evaluation of a player at a selection game, one note per staff member and player. Stored like the
// Hamburg showcase (ITP-Staff-App src/lib/hamburg-showcase/model.ts) in itp.scouting_event_notes, with Hamburg's
// full key set, so its follow-up logic (and its parser, which wants exactly those keys) reads these notes too.
// This file: the shape, labels and limits the page and the route share. Checking, storing and reading a note:
// selection-evaluation-note.ts. Dependency-free, so node --test loads it directly.

export const RATING_KEYS = ['technical', 'athletic', 'tactical', 'mentality', 'overall'] as const
export type RatingKey = (typeof RATING_KEYS)[number]
export const RATING_LABELS: Record<RatingKey, string> = {
  technical: 'Technik', athletic: 'Athletik', tactical: 'Taktik', mentality: 'Mentalität', overall: 'Gesamt',
}

export const OUTCOMES = [
  { value: 'ready_for_recruiting_review', label: 'Bereit für Recruiting-Review' },
  { value: 'college_potential_development', label: 'College-Potenzial mit Entwicklung' },
  { value: 'more_evidence_needed', label: 'Mehr Eindruck nötig' },
  { value: 'no_outcome', label: 'Noch offen' },
] as const
export type ManualOutcome = (typeof OUTCOMES)[number]['value']

export const COLLEGE_FIT = [
  { value: 'yes', label: 'Ja' },
  { value: 'no', label: 'Nein' },
  { value: '', label: 'offen' },
] as const
export type FootballCollegeFit = (typeof COLLEGE_FIT)[number]['value']

// What staff fill in on the page; everything else in the stored note is Hamburg's default
export interface EvaluationInput {
  observedPosition: string
  ratings: Record<RatingKey, number | null>
  positive: string
  developmentPoint: string
  rawVoice: string
  manualOutcome: ManualOutcome
  footballCollegeFit: FootballCollegeFit
}
export type Evaluation = EvaluationInput & { observedAt: string }

export interface EvaluationEntry {
  playerId: string
  scout: string
  note: Evaluation
  version: number
  updatedAt: string
}

export const TEXT_LIMITS = { observedPosition: 100, positive: 1000, developmentPoint: 1000, rawVoice: 1000 } as const

export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const isRating = (v: unknown) => v === null || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5)
export const isOutcome = (v: unknown): v is ManualOutcome => OUTCOMES.some((o) => o.value === v)
export const isFit = (v: unknown): v is FootballCollegeFit => COLLEGE_FIT.some((o) => o.value === v)

export const emptyEvaluation = (): EvaluationInput => ({
  observedPosition: '',
  ratings: { technical: null, athletic: null, tactical: null, mentality: null, overall: null },
  positive: '',
  developmentPoint: '',
  rawVoice: '',
  manualOutcome: 'no_outcome',
  footballCollegeFit: '',
})

// The editable part of a stored note (the form's starting point); no note yet: empty
export const inputOf = (note: Evaluation | undefined): EvaluationInput => {
  if (!note) return emptyEvaluation()
  const { observedPosition, ratings, positive, developmentPoint, rawVoice, manualOutcome, footballCollegeFit } = note
  return { observedPosition, ratings, positive, developmentPoint, rawVoice, manualOutcome, footballCollegeFit }
}

// The stored note changed under an open form (a save, a reload, a version conflict): an untouched form follows
// it, a form with unsaved edits keeps them, and the next "Speichern" saves against the new version
export const formAfterServerChange = (form: EvaluationInput, before: Evaluation | undefined, after: Evaluation | undefined): EvaluationInput =>
  JSON.stringify(form) === JSON.stringify(inputOf(before)) ? inputOf(after) : form

export const savedAtLabel = (iso: string): string =>
  new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
