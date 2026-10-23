import { germanTime, shortDate } from '@/lib/german-date'
import { shortVenue } from '@/lib/invite-og'

// The event-first player page (Naveed's feedback, Max 23.10): hero photo, the three reasons, the reel link.
// Pure, so the page and the tests read the same rules.

const SLUG = /^[a-z0-9][a-z0-9-]*$/

export const heroFile = (slug: string): string => `events/${slug}/hero.jpg`

// The hero photo URL when public/events/<slug>/hero.jpg exists; null means the placeholder hero. A real photo
// is a file drop plus one commit.
export const heroUrlFor = (slug: string | null | undefined, exists: (relativePath: string) => boolean): string | null => {
  if (!slug || !SLUG.test(slug)) return null
  return exists(heroFile(slug)) ? `/${heroFile(slug)}` : null
}

// "Video: https://..." on its own line of the event description opens the reel button; https only
export const videoLink = (description: string | null | undefined): string | null => {
  const m = description?.match(/^[ \t]*Video:[ \t]*(https:\/\/\S+)[ \t]*$/im)
  return m ? m[1] : null
}

export const descriptionWithoutVideo = (description: string | null | undefined): string | null => {
  if (!description) return null
  const rest = description.replace(/^[ \t]*Video:.*$/gim, '').replace(/\n{2,}/g, '\n').trim()
  return rest || null
}

// Under the hero: why this game is worth the player's Friday
export const REASONS = [
  'Du spielst gegen das 1. FC Köln International Talent Program',
  'Das Spiel wird mit Veo gefilmt, du bekommst deine Szenen fürs Profil',
  'Athletes USA schaut zu: Sichtung für US-College-Programme',
] as const

// "Fr 30.10.2026 · 12:00 Uhr · LöWi Arena, Köln-Widdersdorf", the same line as the link preview
export const heroDateLine = (event: { start_date: string; start_time: string | null; location: string | null }): string =>
  [shortDate(event.start_date), germanTime(event.start_time), shortVenue(event.location)].filter(Boolean).join(' · ')
