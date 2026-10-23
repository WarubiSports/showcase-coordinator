import type { PlayerPosition, SchoolType } from '@/types'

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

export const initialAcceptForm = (data: InvitePayload): AcceptFormState => {
  const p = data.player
  return {
    name: p?.name ?? data.invite.name,
    birth_year: p?.birth_year?.toString() ?? '',
    is_adult: '',
    position: p?.position ?? '',
    club: p?.club ?? '',
    school_type: p?.school_type ?? '',
    grad_year: p?.grad_year?.toString() ?? '',
    grades: p?.grades ?? '',
    english_level: p?.english_level ?? '',
    video_url: p?.video_url ?? '',
    profile_url: p?.profile_url ?? data.invite.profile_url ?? '',
    phone: p?.phone ?? data.invite.phone ?? '',
    email: p?.email ?? '',
    parent_name: p?.parent_name ?? '',
    parent_phone: p?.parent_phone ?? '',
    consent_profile: !!p?.consent_profile_at,
    consent_social: !!p?.consent_social_at,
    consent_parent: false,
    consent_name: p?.consent_parent_name ?? '',
  }
}

// Shared input styling: 16px text so iOS does not zoom
export const INPUT_CLASS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-transparent'
export const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1'

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
