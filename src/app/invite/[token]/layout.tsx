import type { Metadata } from 'next'
import { IBM_Plex_Mono, Inter, Kanit } from 'next/font/google'
import { createAdminClient } from '@/lib/supabase-admin'
import { firstName } from '@/lib/german-date'
import { ogDescription, ogTitle, type OgEvent } from '@/lib/invite-og'

// The player pages wear the Athletes USA portal look: Inter for text, Kanit for headings, IBM Plex Mono for
// numbers (athlete.athletesusa.org). The tokens live in globals.css under the ausa- prefix.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const kanit = Kanit({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-kanit', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-plex-mono', display: 'swap' })

type Row = { status: string; name: string; event: (OgEvent & { name: string }) | null }

// Link preview for the WhatsApp message: "{Vorname}, du bist eingeladen: ..." with the date, the place and the
// Veo line; the image comes from opengraph-image.tsx next to this file. An invalid or declined link gets the
// neutral text. Never indexed.
export const generateMetadata = async ({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> => {
  const { token } = await params
  const base: Metadata = { robots: { index: false, follow: false } }

  // Metadata is best effort: an unusable database target or a missing table must not break the page
  let row: Row | null = null
  try {
    const { data } = await createAdminClient()
      .from('showcase_invites')
      .select('status, name, event:showcase_events(name, start_date, start_time, location)')
      .eq('token', token)
      .maybeSingle()
    row = (data as unknown as Row | null) ?? null
  } catch {
    row = null
  }
  const personal = !!row && row.status !== 'declined'
  const title = ogTitle(personal && row ? firstName(row.name) : null)
  const description = ogDescription(row?.event)
  return {
    ...base,
    title: row?.event ? `${row.event.name} | Deine Einladung` : 'Deine Einladung',
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${kanit.variable} ${plexMono.variable} font-ausa-sans`}>{children}</div>
}
