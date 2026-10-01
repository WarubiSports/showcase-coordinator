import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

const formatDay = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

// Server-rendered title/description so shared links (WhatsApp, iMessage) show a proper preview card
export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> => {
  const { slug } = await params
  const { data: event } = await supabase
    .from('showcase_events')
    .select('name, host_name, start_date, location')
    .eq('slug', slug)
    .single()

  if (!event) return { title: 'Event | Registration' }

  const title = `${event.name} | Registration`
  const description = [formatDay(event.start_date), event.location, event.host_name ? `Hosted by ${event.host_name}` : null]
    .filter(Boolean)
    .join(' · ')

  return {
    title,
    description,
    openGraph: { title: event.name, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: event.name, description },
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children
}
