import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'
import { getEventOverride, resolveEventSlug } from '@/lib/event-overrides'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Event registration'

const siteOrigin = () => {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  return host ? `https://${host}` : 'http://localhost:3000'
}

const formatDay = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Google Fonts serves TTF to server-side fetches; fall back to the built-in font if it fails
const loadGeist = async (weight: number) => {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}`)).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}

// Link-preview card for shared event URLs
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [black, regular] = await Promise.all([loadGeist(900), loadGeist(400)])
  const fonts = [
    ...(black ? [{ name: 'Geist', data: black, weight: 900 as const, style: 'normal' as const }] : []),
    ...(regular ? [{ name: 'Geist', data: regular, weight: 400 as const, style: 'normal' as const }] : []),
  ]
  const { data: event } = await supabase
    .from('showcase_events')
    .select('name, host_name, host_logo_url, start_date, start_time, end_time, location, price, currency, accent_color')
    .eq('slug', resolveEventSlug(slug).dataSlug)
    .single()

  const accent = event?.accent_color || '#3B82F6'
  const logo = event?.host_logo_url
    ? event.host_logo_url.startsWith('http') ? event.host_logo_url : `${siteOrigin()}${event.host_logo_url}`
    : null
  const start = formatTime(event?.start_time ?? null)
  const end = formatTime(event?.end_time ?? null)
  const extras = getEventOverride(slug)
  const isAlias = resolveEventSlug(slug).isAlias
  const name = isAlias ? extras.hero?.title ?? event?.name : event?.name
  const when = isAlias && extras.days
    ? extras.days.map((d) => `${d.label} ${d.month} ${d.dateNum}`).join(' · ')
    : event ? [formatDay(event.start_date), start && end ? `${start} to ${end}` : start].filter(Boolean).join(' · ') : ''
  const where = isAlias ? event?.location.replace(/, Field \d+/, '') : event?.location

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: `radial-gradient(circle at 85% 20%, ${accent}55 0%, #0b0d12 55%)`,
          color: 'white',
          padding: 64,
          fontFamily: fonts.length ? 'Geist' : 'sans-serif',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: accent, display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, letterSpacing: 6, textTransform: 'uppercase', color: accent, display: 'flex' }}>
              {event?.host_name ? `Hosted by ${event.host_name}` : 'Registration open'}
            </div>
            <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.02, marginTop: 20, textTransform: 'uppercase', display: 'flex', maxWidth: 760 }}>
              {name || 'Event registration'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 30, color: '#d1d5db' }}>
            <div style={{ display: 'flex' }}>{when}</div>
            <div style={{ display: 'flex', marginTop: 8 }}>{where || ''}</div>
            <div style={{ display: 'flex', marginTop: 28 }}>
              <div style={{ display: 'flex', background: accent, color: 'white', padding: '14px 30px', borderRadius: 16, fontSize: 30, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
                Register now
              </div>
            </div>
          </div>
        </div>
        {logo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 300 }}>
            <img src={logo} width={280} height={280} style={{ objectFit: 'contain' }} alt="" />
          </div>
        )}
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  )
}
