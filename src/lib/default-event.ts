import type { ShowcaseEvent } from '@/types'

type EventDates = Pick<ShowcaseEvent, 'slug' | 'start_date' | 'end_date'>

// Template events (slug template-…) are never a default landing: they carry placeholder dates and no venue.
export const isTemplateEvent = (event: Pick<ShowcaseEvent, 'slug'>): boolean => event.slug.startsWith('template-')

// Where a browser with no saved event lands: the nearest upcoming event (earliest start among those not yet
// over), else the most recent past event, never a template. Only when nothing else exists does the first
// row (a template) remain the pick, so the app still has a current event.
export const defaultEvent = <T extends EventDates>(events: T[], today: string): T | null => {
  const real = events.filter((e) => !isTemplateEvent(e))
  const upcoming = real.filter((e) => e.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date))
  if (upcoming[0]) return upcoming[0]
  const past = [...real].sort((a, b) => b.end_date.localeCompare(a.end_date))
  return past[0] ?? events[0] ?? null
}
