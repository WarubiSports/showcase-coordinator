import { createAdminClient } from '@/lib/supabase-admin'
import { inviteOgModel, type OgEvent } from '@/lib/invite-og'
import { renderInviteOg } from '@/lib/invite-og-image'
import { fetchPhotoDataUrl, loadOgFonts, publicImage } from '@/lib/og-assets'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Deine Einladung: Athletes USA Auswahl vs. 1. FC Köln ITP'

type Row = { status: string; name: string; photo_url: string | null; event: OgEvent | null }

// Link-preview image for the invite link (WhatsApp, iMessage): the player's photo or initials, the headline
// with the first name, the lockup and the date line. Public by the token like the page itself; an invalid or
// declined link renders the neutral version with nothing personal on it.
export default async function OpengraphImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let row: Row | null = null
  if (token.length >= 16) {
    try {
      const { data } = await createAdminClient()
        .from('showcase_invites')
        .select('status, name, photo_url, event:showcase_events(start_date, start_time, location)')
        .eq('token', token)
        .maybeSingle()
      row = (data as unknown as Row | null) ?? null
    } catch {
      row = null
    }
  }
  const model = inviteOgModel(row, row?.event)
  const [fonts, ausaLogo, fckLogo, photo] = await Promise.all([
    loadOgFonts(),
    publicImage('/logo-ausa.png'),
    publicImage('/events/808/fc-koeln-football-school.png'),
    model.personal ? fetchPhotoDataUrl(row?.photo_url) : Promise.resolve(null),
  ])
  return renderInviteOg(model, { photo, ausaLogo, fckLogo, fonts })
}
