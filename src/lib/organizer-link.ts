import { createHmac, timingSafeEqual } from 'crypto'
import { getEventOverride } from '@/lib/event-overrides'

// Private organizer links: /event/<slug>/organizer?key=<organizerKey(slug)>
// The key is an HMAC of the slug, so rotating ORGANIZER_LINK_SECRET revokes every link.
export const organizerKey = (slug: string): string =>
  createHmac('sha256', process.env.ORGANIZER_LINK_SECRET!).update(`organizer:${slug}`).digest('base64url').slice(0, 24)

export const isValidOrganizerKey = (slug: string, key: string | null): boolean => {
  if (!key || !process.env.ORGANIZER_LINK_SECRET) return false
  const expected = Buffer.from(organizerKey(slug))
  const given = Buffer.from(key)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

// Slugs an organizer link covers: the event plus its sibling days (e.g. boys + girls)
export const organizerSlugs = (slug: string): string[] => [
  ...new Set([slug, ...(getEventOverride(slug).days?.map((d) => d.slug) ?? [])]),
]
