import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { getEventOverride, resolveEventSlug } from '@/lib/event-overrides'

const formatDay = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

// Server-rendered title/description so shared links (WhatsApp, iMessage) show a proper preview card
export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> => {
  const { slug } = await params
  const { dataSlug, isAlias } = resolveEventSlug(slug)
  const { data: event } = await supabase
    .from('showcase_events')
    .select('name, host_name, start_date, location')
    .eq('slug', dataSlug)
    .single()

  if (!event) return { title: 'Event | Registration' }

  // The shared multi-day link lists every day instead of the mapped day's date
  const extras = getEventOverride(slug)
  const name = isAlias ? extras.hero?.title ?? event.name : event.name
  const when = isAlias && extras.days
    ? extras.days.map((d) => `${d.label} ${d.month} ${d.dateNum}`).join(' · ')
    : formatDay(event.start_date)
  const where = isAlias ? event.location.replace(/, Field \d+/, '') : event.location

  const title = `${name} | Registration`
  const description = [when, where, event.host_name ? `Hosted by ${event.host_name}` : null].filter(Boolean).join(' · ')

  return {
    title,
    description,
    openGraph: { title: name, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: name, description },
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children
}
