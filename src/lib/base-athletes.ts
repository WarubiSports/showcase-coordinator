import type { createAdminClient } from '@/lib/supabase-admin'
import type { PlayerPosition, SchoolType } from '@/types'
import { isProfileUrl } from '@/lib/profile-url'
import { safeBasePhotoUrl } from '@/lib/photo-url'

// Read-only view of Base (public.athletes in the same Warubi Core project) for the selection invites.
// Server only: every call runs with the service role; nothing here is written back to Base.

// The admin client is bound to schema itp (ITP move); Base lives in public, so each read switches schema per query
type AdminClient = ReturnType<typeof createAdminClient>

export const ATHLETE_COLUMNS =
  'id, full_name, first_name, last_name, date_of_birth, teams, position_primary, position_soccer, schulabschluss_typ, abitur_year, schulabschluss_datum, graduation_date, gpa_overall, english_level, highlight_video_url, home_statistics_url, transfermarkt_url, phone, parent_first_name, parent_last_name, parent_phone, profile_picture_url, photo_url, unified_stage'

export interface BaseAthleteRow {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  teams: string | null
  position_primary: string | null
  position_soccer: string[] | null
  schulabschluss_typ: string | null
  abitur_year: number | null
  schulabschluss_datum: string | null
  graduation_date: string | null
  gpa_overall: number | null
  english_level: string | null
  highlight_video_url: string | null
  // Base's FuPa link lives here (the v_german_coverage view calls it fupa_url); athletes.profile_url is the
  // profiles.athletesusa.org page and is not a stats profile
  home_statistics_url: string | null
  transfermarkt_url: string | null
  phone: string | null
  parent_first_name: string | null
  parent_last_name: string | null
  parent_phone: string | null
  profile_picture_url: string | null
  photo_url: string | null
  unified_stage: string | null
}

// What the player form can take over from Base ("bitte prüfen" on the page)
export interface BasePrefill {
  name: string | null
  birth_year: number | null
  position: PlayerPosition | null
  club: string | null
  school_type: SchoolType | null
  grad_year: number | null
  grades: string | null
  english_level: string | null
  video_url: string | null
  profile_url: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  photo_url: string | null
}

// Base position labels (free text, several spellings) to the coordinator's codes; unclear ones stay empty
const POSITION_MAP: [RegExp, PlayerPosition][] = [
  [/goal ?keeper|torwart|^gk$/i, 'GK'],
  [/center ?back|centre ?back|innenverteidiger|^cb$/i, 'CB'],
  [/left ?back|linksverteidiger|^lb$/i, 'LB'],
  [/right ?back|rechtsverteidiger|^rb$/i, 'RB'],
  [/defensive ?mid|^dm$|^cdm$|sechser/i, 'CDM'],
  [/attacking ?mid|^com$|^cam$|^am$|zehner|^attacking$/i, 'CAM'],
  [/central ?mid|^cm$|^midfielder$|mittelfeld/i, 'CM'],
  [/left ?wing|^lw$|linksaußen/i, 'LW'],
  [/right ?wing|^rw$|rechtsaußen/i, 'RW'],
  [/striker|forward|stürmer|^st$|^cf$/i, 'ST'],
]

// Base often lists several positions ("RW, LW, ST", "CDM, CM"): the whole label first, then the first part that maps
export const mapPosition = (label: string | null | undefined): PlayerPosition | null => {
  const l = label?.trim()
  if (!l) return null
  for (const part of [l, ...l.split(/[,/]/).map((s) => s.trim()).filter(Boolean)]) {
    const hit = POSITION_MAP.find(([re]) => re.test(part))?.[1]
    if (hit) return hit
  }
  return null
}

const mapSchoolType = (label: string | null | undefined): SchoolType | null => {
  const l = label?.trim().toLowerCase()
  if (!l) return null
  if (l === 'abitur') return 'abitur'
  if (l === 'fachabitur') return 'fachabitur'
  if (l.includes('realschul')) return 'realschule'
  return 'other'
}

const yearOf = (iso: string | null | undefined): number | null => {
  const m = iso?.match(/(19|20)\d{2}/)
  return m ? Number(m[0]) : null
}

const firstValid = (...urls: (string | null | undefined)[]): string | null =>
  urls.find((u): u is string => !!u && isProfileUrl(u)) ?? null

export const toPrefill = (a: BaseAthleteRow): BasePrefill => ({
  name: a.full_name?.trim() || [a.first_name, a.last_name].filter(Boolean).join(' ').trim() || null,
  birth_year: yearOf(a.date_of_birth),
  position: mapPosition(a.position_primary) ?? mapPosition(a.position_soccer?.[0]),
  club: a.teams?.trim() || null,
  school_type: mapSchoolType(a.schulabschluss_typ),
  grad_year: a.abitur_year ?? yearOf(a.schulabschluss_datum) ?? yearOf(a.graduation_date),
  grades: a.gpa_overall != null ? String(a.gpa_overall).replace('.', ',') : null,
  english_level: a.english_level?.trim() || null,
  video_url: a.highlight_video_url?.trim() || null,
  profile_url: firstValid(a.home_statistics_url, a.transfermarkt_url),
  phone: a.phone?.trim() || null,
  parent_name: [a.parent_first_name, a.parent_last_name].filter(Boolean).join(' ').trim() || null,
  parent_phone: a.parent_phone?.trim() || null,
  photo_url: safeBasePhotoUrl(a.profile_picture_url) ?? safeBasePhotoUrl(a.photo_url),
})

// Signed with Athletes USA = Base's register (leads.signed_at, 20260915_signed_register.sql) or the
// historical signed_cohort table. Returns the earliest known date per athlete id.
export const signedDates = async (db: AdminClient, athleteIds: string[]): Promise<Map<string, string>> => {
  const out = new Map<string, string>()
  if (athleteIds.length === 0) return out
  const pub = db.schema('public')
  const [{ data: leads }, { data: cohort }] = await Promise.all([
    pub.from('leads').select('athlete_id, signed_at').in('athlete_id', athleteIds).not('signed_at', 'is', null).is('deleted_at', null),
    pub.from('signed_cohort').select('athlete_id, signed_date').in('athlete_id', athleteIds),
  ])
  for (const r of [...(leads ?? []), ...(cohort ?? [])] as { athlete_id: string; signed_at?: string; signed_date?: string }[]) {
    const d = (r.signed_at ?? r.signed_date ?? '').slice(0, 10)
    if (!d) continue
    const prev = out.get(r.athlete_id)
    if (!prev || d < prev) out.set(r.athlete_id, d)
  }
  return out
}

export const fetchAthlete = async (db: AdminClient, id: string): Promise<BaseAthleteRow | null> => {
  const { data } = await db.schema('public').from('athletes').select(ATHLETE_COLUMNS).eq('id', id).is('deleted_at', null).maybeSingle()
  return (data as BaseAthleteRow | null) ?? null
}
