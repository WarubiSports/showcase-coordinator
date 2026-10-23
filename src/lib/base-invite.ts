import { toPrefill, type BaseAthleteRow } from '@/lib/base-athletes'

export interface BaseInviteFields {
  profile_url: string | null
  photo_url: string | null
  club: string | null
  position: string | null
}

// What an invite takes from its Base athlete, on create and on "Sync from Base": the link staff gave wins,
// else Base's FuPa or Transfermarkt page; photo, club and position are Base's. A FuPa read afterwards
// overwrites them with the live values; without a FuPa link, or when that read fails, these stay.
export const baseInviteFields = (athlete: BaseAthleteRow, givenProfileUrl: string | null | undefined): BaseInviteFields => {
  const p = toPrefill(athlete)
  return { profile_url: givenProfileUrl || p.profile_url, photo_url: p.photo_url, club: p.club, position: p.position }
}

// Only what Base knows is written, so a sync never blanks a field the invite already has
export const definedFields = (fields: BaseInviteFields): Partial<BaseInviteFields> =>
  Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null)) as Partial<BaseInviteFields>
