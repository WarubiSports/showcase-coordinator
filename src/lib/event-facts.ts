import { treffpunktLine } from '@/lib/invite-message'
import { germanTime, weekdayDate } from '@/lib/german-date'
import { descriptionWithoutVideo } from '@/lib/event-page'

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

interface EventFactsInput {
  name: string
  start_date: string
  start_time: string | null
  end_time: string | null
  description: string | null
}

// The rows of the facts card. Under the hero (which already shows the match and the date) the title and the
// date row stay out, so nothing is said twice; on its own the card keeps both.
export const eventFactsModel = (event: EventFactsInput, { hero = false }: { hero?: boolean } = {}) => {
  // The meeting point comes before kick-off: with a Treffpunkt the time row says so, the plain range otherwise
  const treffpunkt = treffpunktLine(event.description)
  const start = germanTime(event.start_time)
  const end = event.end_time ? germanTime(event.end_time) : null
  const time = treffpunkt ? [start ? `Anpfiff ${start}` : null, end ? `Ende ${end}` : null].filter(Boolean).join(' · ') : [start, end ? `bis ${end}` : null].filter(Boolean).join(' ')
  return {
    title: hero ? null : event.name,
    date: hero ? null : weekdayDate(event.start_date),
    time: time || null,
    treffpunkt,
    description: descriptionWithoutTreffpunkt(descriptionWithoutVideo(event.description)),
  }
}
