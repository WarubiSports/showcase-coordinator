import { firstName, germanTime, shortDate, shortDayMonth } from '@/lib/german-date'

// Text of the WhatsApp link preview (og:title, og:description) and of the preview image. Pure, so the
// image and the metadata say the same thing and the tests can read it without a database.
export interface OgEvent {
  start_date: string
  start_time: string | null
  location: string | null
}

export interface InviteOgModel {
  personal: boolean
  firstName: string | null
  headline: string
  initials: string | null
  dateLine: string
}

export const MATCH_LINE = 'Athletes USA Auswahl vs. 1. FC Köln ITP'
export const VEO_LINE = 'Das Spiel wird mit Veo gefilmt, deine Clips fürs Profil'

// "LöWi Arena, Neue Sandkaul 21, 50859 Köln-Widdersdorf" -> "LöWi Arena, Köln-Widdersdorf": venue and town, no street
export const shortVenue = (location: string | null | undefined, sep = ', '): string => {
  const parts = (location ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  const town = parts[parts.length - 1].replace(/^\d{4,5}\s+/, '')
  return [parts[0], town].join(sep)
}

export const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

// A personal preview for a live invite; invalid or declined links get the neutral one without name or photo
export const inviteOgModel = (invite: { name: string; status: string } | null | undefined, event: OgEvent | null | undefined): InviteOgModel => {
  const personal = !!invite && invite.status !== 'declined'
  const first = personal ? firstName(invite.name) : ''
  const dateLine = event ? [shortDate(event.start_date), germanTime(event.start_time), shortVenue(event.location)].filter(Boolean).join(' · ') : ''
  return {
    personal,
    firstName: first || null,
    headline: first ? `Du bist eingeladen, ${first}` : 'Du bist eingeladen',
    initials: personal && invite ? initials(invite.name) || null : null,
    dateLine,
  }
}

export const ogTitle = (first: string | null): string => (first ? `${first}, du bist eingeladen: ${MATCH_LINE}` : `Deine Einladung: ${MATCH_LINE}`)

export const ogDescription = (event: OgEvent | null | undefined): string =>
  [event ? shortDayMonth(event.start_date) : null, germanTime(event?.start_time), event ? shortVenue(event.location, ' ') : null, VEO_LINE].filter(Boolean).join(' · ')
