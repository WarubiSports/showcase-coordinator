import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-admin'
import { germanTime, weekdayDate } from '@/lib/german-date'

// Link preview for the WhatsApp message: event name, date, place. Never indexed.
export const generateMetadata = async ({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> => {
  const { token } = await params
  const base: Metadata = { robots: { index: false, follow: false } }

  // Metadata is best effort: an unusable database target or a missing table must not break the page
  let event: { name: string; start_date: string; start_time: string | null; location: string } | null | undefined
  try {
    const { data } = await createAdminClient()
      .from('showcase_invites')
      .select('event:showcase_events(name, start_date, start_time, location)')
      .eq('token', token)
      .maybeSingle()
    event = data?.event as typeof event
  } catch {
    event = null
  }
  if (!event) return { ...base, title: 'Deine Einladung' }

  const description = [weekdayDate(event.start_date), germanTime(event.start_time), event.location].filter(Boolean).join(' · ')
  return {
    ...base,
    title: `${event.name} | Deine Einladung`,
    description,
    openGraph: { title: event.name, description, type: 'website' },
  }
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children
}
