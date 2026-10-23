import { normalizeName } from '@/lib/name-normalize'
import type { FupaCandidate } from '@/types'

// What the add-invites panel knows about a typed name after the Base lookup and, when Base has nobody,
// the FuPa search. Pure: the component only fetches and renders.
export interface BaseMatch {
  id: string
  name: string
  club: string | null
  birth_year: number | null
  stage: string | null
  phone: string | null
  signed: boolean
  signed_date: string | null
}

export type LookupState =
  | { kind: 'idle' }
  | { kind: 'base'; match: BaseMatch; auto: boolean }
  | { kind: 'base-pick'; matches: BaseMatch[] }
  | { kind: 'fupa'; candidate: FupaCandidate; auto: boolean }
  | { kind: 'fupa-pick'; candidates: FupaCandidate[] }
  | { kind: 'none' }

// Base first: the one exact-name match is taken as is, several matches (exact or partial) are offered to pick.
// Only when Base has nobody for that name does FuPa count: one hit is taken, several are offered.
export const resolveBase = (name: string, matches: BaseMatch[]): LookupState | null => {
  if (matches.length === 0) return null
  const wanted = normalizeName(name)
  const exact = matches.filter((m) => normalizeName(m.name) === wanted)
  if (exact.length === 1) return { kind: 'base', match: exact[0], auto: true }
  return { kind: 'base-pick', matches: matches.slice(0, 5) }
}

export const resolveFupa = (candidates: FupaCandidate[] | null): LookupState => {
  if (!candidates || candidates.length === 0) return { kind: 'none' }
  if (candidates.length === 1) return { kind: 'fupa', candidate: candidates[0], auto: true }
  return { kind: 'fupa-pick', candidates }
}

// What goes on the invite from the state: the Base link (category from Base's register) or the FuPa page
export interface LookupResult {
  ausa_athlete_id?: string
  profile_url?: string
  category: 'signed' | 'new'
}

export const lookupResult = (state: LookupState): LookupResult => {
  if (state.kind === 'base') return { ausa_athlete_id: state.match.id, category: state.match.signed ? 'signed' : 'new' }
  if (state.kind === 'fupa') return { profile_url: `https://www.fupa.net${state.candidate.link_url}`, category: 'new' }
  return { category: 'new' }
}
