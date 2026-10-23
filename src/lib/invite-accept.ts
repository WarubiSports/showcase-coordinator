import type { PlayerPosition, SchoolType } from '@/types'

// Validation for the player's accept form (server side; the page mirrors the rules for instant feedback).
// Error strings are player-facing German.

export const POSITIONS: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
export const SCHOOL_TYPES: SchoolType[] = ['abitur', 'fachabitur', 'realschule', 'other']

export interface AcceptFormData {
  name: string
  birth_year: number
  is_adult: boolean | null
  position: PlayerPosition | null
  club: string | null
  school_type: SchoolType | null
  grad_year: number | null
  grades: string | null
  english_level: string | null
  video_url: string | null
  phone: string
  email: string | null
  parent_name: string | null
  parent_phone: string | null
  consent_profile: boolean
  consent_social: boolean
  consent_parent: boolean
  consent_name: string
}

export type ParsedAccept = { ok: true; data: AcceptFormData; minor: boolean } | { ok: false; error: string }

// Birth year alone cannot tell 17 from 18 in the year someone turns 18, so that year gets an explicit question
export const needsAdultQuestion = (birthYear: number, eventYear: number): boolean => eventYear - birthYear === 18

export const isMinorAtEvent = (birthYear: number, isAdult: boolean | null, eventYear: number): boolean => {
  const age = eventYear - birthYear
  return age < 18 || (age === 18 && isAdult !== true)
}

const text = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t || null
}

const int = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isInteger(n) ? n : null
}

const bool = (v: unknown): boolean => v === true || v === 'true'

export const parseAcceptForm = (raw: unknown, eventYear: number): ParsedAccept => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const name = text(r.name, 120)
  if (!name) return { ok: false, error: 'Bitte gib deinen Namen an.' }

  const birth_year = int(r.birth_year)
  if (!birth_year || birth_year < 1990 || birth_year > 2015) return { ok: false, error: 'Bitte gib dein Geburtsjahr an.' }

  // Required since 23.10 (Max): position, school type, grad year and grades, so every accepted player is college-screenable
  const position = text(r.position, 5)
  if (!POSITIONS.includes(position as PlayerPosition)) return { ok: false, error: 'Bitte wähl deine Position.' }

  const school_type = text(r.school_type, 20)
  if (!SCHOOL_TYPES.includes(school_type as SchoolType)) return { ok: false, error: 'Bitte gib deinen Schulabschluss an.' }

  const grad_year = int(r.grad_year)
  if (grad_year === null) return { ok: false, error: 'Bitte gib dein Abschlussjahr an.' }
  if (grad_year < 2020 || grad_year > 2035) return { ok: false, error: 'Das Abschlussjahr sieht nicht richtig aus.' }

  const grades = text(r.grades, 60)
  if (!grades) return { ok: false, error: 'Bitte gib deinen Notenschnitt an.' }

  const phone = text(r.phone, 40)
  if (!phone) return { ok: false, error: 'Bitte gib eine Handynummer an.' }

  const is_adult = r.is_adult === true ? true : r.is_adult === false ? false : null
  if (needsAdultQuestion(birth_year, eventYear) && is_adult === null) {
    return { ok: false, error: 'Bitte sag uns, ob du am Spieltag schon 18 bist.' }
  }
  const minor = isMinorAtEvent(birth_year, is_adult, eventYear)

  const parent_name = text(r.parent_name, 120)
  const parent_phone = text(r.parent_phone, 40)
  const consent_parent = bool(r.consent_parent)
  if (minor && (!parent_name || !parent_phone)) return { ok: false, error: 'Bitte gib Name und Handynummer eines Elternteils an.' }
  if (minor && !consent_parent) return { ok: false, error: 'Bitte bestätige die Zustimmung des Elternteils.' }

  const consent_name = text(r.consent_name, 120)
  if (!consent_name) return { ok: false, error: 'Bitte gib den Namen der Person an, die zustimmt.' }

  const email = text(r.email, 160)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Die E-Mail-Adresse sieht nicht richtig aus.' }

  const video_url = text(r.video_url, 500)
  if (video_url && !/^https?:\/\//i.test(video_url)) return { ok: false, error: 'Der Video-Link muss mit http beginnen.' }

  return {
    ok: true,
    minor,
    data: {
      name,
      birth_year,
      is_adult,
      position: position as PlayerPosition,
      club: text(r.club, 120),
      school_type: school_type as SchoolType,
      grad_year,
      grades,
      english_level: text(r.english_level, 40),
      video_url,
      phone,
      email,
      parent_name: minor ? parent_name : null,
      parent_phone: minor ? parent_phone : null,
      consent_profile: bool(r.consent_profile),
      consent_social: bool(r.consent_social),
      consent_parent: minor && consent_parent,
      consent_name,
    },
  }
}
