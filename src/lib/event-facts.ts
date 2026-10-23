import { treffpunktLine } from '@/lib/invite-message'

interface EventPlace {
  location: string
  venue_lat?: number | string | null
  venue_lng?: number | string | null
}

export { treffpunktLine }

// The description without its Treffpunkt sentence, which the page shows as its own row
export const descriptionWithoutTreffpunkt = (description: string | null | undefined): string | null => {
  if (!description) return null
  const rest = description.replace(/\s*Treffpunkt[^.\n]*\.?/, '').replace(/\s{2,}/g, ' ').trim()
  return rest || null
}

// A maps link for the venue: coordinates when the event has them, else the address as a search.
// Google's search URL opens the Maps app on phones and the website elsewhere.
export const mapsUrl = (event: EventPlace): string | null => {
  const lat = Number(event.venue_lat)
  const lng = Number(event.venue_lng)
  if (event.venue_lat != null && event.venue_lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }
  const address = event.location?.trim()
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null
}
