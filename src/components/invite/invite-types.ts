import type { PlayerPosition, SchoolType } from '@/types'
import type { BasePrefill } from '@/lib/base-athletes'

// Payload of GET /api/invite/[token]
export interface InvitePayload {
  invite: {
    id: string
    status: 'invited' | 'accepted' | 'declined'
    name: string
    first_name: string
    phone: string | null
    invited_by: string
    responded_at: string | null
    profile_url: string | null
    ausa_athlete_id: string | null
    category: 'signed' | 'new' | null
    // FuPa enrichment, read by the server from the profile link; all null until read or when the read failed
    photo_url: string | null
    club: string | null
    league: string | null
    position: string | null
    stats: { season: string | null; games: number; goals: number; assists: number; team: string | null; league: string | null; career?: { games: number; goals: number; assists: number; seasons: number } | null } | null
    enriched_at: string | null
  }
  event: {
    name: string
    slug: string
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    location: string
    description: string | null
    venue_lat?: number | string | null
    venue_lng?: number | string | null
    hero_url?: string | null
  }
  player: {
    name: string
    birth_year: number | null
    position: PlayerPosition | null
    club: string | null
    email: string | null
    phone: string | null
    parent_name: string | null
    parent_phone: string | null
    school_type: SchoolType | null
    grad_year: number | null
    grades: string | null
    english_level: string | null
    video_url: string | null
    profile_url: string | null
    consent_profile_at: string | null
    consent_social_at: string | null
    consent_parent_name: string | null
  } | null
  // Read-only prefill from the player's Athletes USA profile in Base, when the invite is linked
  base: { name: string | null; photo_url: string | null; prefill: BasePrefill } | null
}

export interface AcceptFormState {
  name: string
  birth_year: string
  is_adult: 'ja' | 'nein' | ''
  position: PlayerPosition | ''
  club: string
  school_type: SchoolType | ''
  grad_year: string
  grades: string
  english_level: string
  video_url: string
  profile_url: string
  phone: string
  email: string
  parent_name: string
  parent_phone: string
  consent_profile: boolean
  consent_social: boolean
  consent_parent: boolean
  consent_name: string
}

// Order of truth: what the player saved before, then the invite, then the Base profile ("bitte prüfen")
export const initialAcceptForm = (data: InvitePayload): AcceptFormState => {
  const p = data.player
  const b = data.base?.prefill
  return {
    name: p?.name ?? data.invite.name,
    birth_year: p?.birth_year?.toString() ?? b?.birth_year?.toString() ?? '',
    is_adult: '',
    position: p?.position ?? b?.position ?? '',
    club: p?.club ?? b?.club ?? '',
    school_type: p?.school_type ?? b?.school_type ?? '',
    grad_year: p?.grad_year?.toString() ?? b?.grad_year?.toString() ?? '',
    grades: p?.grades ?? b?.grades ?? '',
    english_level: p?.english_level ?? b?.english_level ?? '',
    video_url: p?.video_url ?? b?.video_url ?? '',
    profile_url: p?.profile_url ?? data.invite.profile_url ?? b?.profile_url ?? '',
    phone: p?.phone ?? data.invite.phone ?? b?.phone ?? '',
    email: p?.email ?? '',
    parent_name: p?.parent_name ?? b?.parent_name ?? '',
    parent_phone: p?.parent_phone ?? b?.parent_phone ?? '',
    consent_profile: !!p?.consent_profile_at,
    consent_social: !!p?.consent_social_at,
    consent_parent: false,
    consent_name: p?.consent_parent_name ?? '',
  }
}

// Shared input styling: 16px text so iOS does not zoom
export const INPUT_CLASS =
  'w-full rounded-md border border-ausa-ink-300 bg-ausa-paper px-3 py-2.5 text-base text-ausa-ink-900 placeholder-ausa-ink-400 focus:outline-none focus:ring-2 focus:ring-ausa-ink-900 focus:border-transparent'
export const LABEL_CLASS = 'block text-sm font-medium text-ausa-ink-700 mb-1'

// Option lists for the accept form (German labels, stored values match the database)
export const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'GK', label: 'Torwart' },
  { value: 'CB', label: 'Innenverteidiger' },
  { value: 'LB', label: 'Linksverteidiger' },
  { value: 'RB', label: 'Rechtsverteidiger' },
  { value: 'CDM', label: 'Defensives Mittelfeld' },
  { value: 'CM', label: 'Zentrales Mittelfeld' },
  { value: 'CAM', label: 'Offensives Mittelfeld' },
  { value: 'LW', label: 'Linksaußen' },
  { value: 'RW', label: 'Rechtsaußen' },
  { value: 'ST', label: 'Stürmer' },
]
export const SCHOOL_TYPES: { value: SchoolType; label: string }[] = [
  { value: 'abitur', label: 'Abitur' },
  { value: 'fachabitur', label: 'Fachabitur' },
  { value: 'realschule', label: 'Realschulabschluss' },
  { value: 'other', label: 'Anderer / noch offen' },
]
export const ENGLISH_LEVELS = ['Grundkenntnisse', 'Gut', 'Sehr gut', 'Fließend']
