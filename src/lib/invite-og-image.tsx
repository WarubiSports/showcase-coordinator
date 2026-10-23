/* eslint-disable @next/next/no-img-element */
// Satori renders plain img elements; next/image has no place in an OpenGraph image
import { ImageResponse } from 'next/og'
import { MATCH_LINE, type InviteOgModel } from '@/lib/invite-og'

export const OG_SIZE = { width: 1200, height: 630 }
export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: 'normal' }
export interface OgAssets {
  photo: string | null
  ausaLogo: string
  fckLogo: string
  fonts: OgFont[]
}

// Portal tokens (globals.css, ausa- prefix); satori reads no CSS, so the values are repeated here
const INK = '#1a2744'
const INK_500 = '#4a5670'
const INK_200 = '#d8d2c2'
const INK_50 = '#f5f2ea'
const PAPER = '#fffdf7'
const ACCENT = '#c1272d'

// Both logos at the same height, as on the event card. Partner materials carry the Football School logo.
const Lockup = ({ a, h }: { a: OgAssets; h: number }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <img src={a.ausaLogo} width={Math.round((h * 1235) / 608)} height={h} alt="" />
    <div style={{ display: 'flex', margin: `0 ${Math.round(h / 3)}px`, fontSize: Math.round(h / 2), fontWeight: 600, color: INK_500 }}>vs.</div>
    <img src={a.fckLogo} width={Math.round((h * 868) / 520)} height={h} alt="" />
  </div>
)

// Right side: the photo, else initials in a navy circle, else (neutral preview) the two logos large
const Portrait = ({ m, a }: { m: InviteOgModel; a: OgAssets }) => {
  if (a.photo) return <img src={a.photo} width={300} height={380} style={{ objectFit: 'cover', objectPosition: 'top', borderRadius: 28, border: `2px solid ${INK_200}`, background: INK_50 }} alt="" />
  if (m.initials) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 240, height: 240, borderRadius: 120, background: INK, color: PAPER, fontFamily: 'Kanit', fontSize: 100, fontWeight: 700 }}>
        {m.initials}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <img src={a.ausaLogo} width={280} height={138} alt="" />
      <img src={a.fckLogo} width={234} height={140} style={{ marginTop: 28 }} alt="" />
    </div>
  )
}

export const renderInviteOg = (m: InviteOgModel, a: OgAssets) => {
  const text = a.fonts.length ? 'Inter' : 'sans-serif'
  const display = a.fonts.some((f) => f.name === 'Kanit') ? 'Kanit' : text
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: INK_50, fontFamily: text, color: INK }}>
        <div style={{ display: 'flex', height: 12, background: ACCENT }} />
        <div style={{ display: 'flex', flex: 1, margin: 44, background: PAPER, borderRadius: 32, border: `2px solid ${INK_200}`, padding: '44px 56px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 32 }}>
            <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', color: ACCENT, fontWeight: 600 }}>Athletes USA Auswahl</div>
            <div style={{ display: 'flex', fontFamily: display, fontSize: 64, fontWeight: 700, lineHeight: 1.05, marginTop: 12 }}>{m.headline}</div>
            {m.personal && (
              <div style={{ display: 'flex', marginTop: 28 }}>
                <Lockup a={a} h={56} />
              </div>
            )}
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, marginTop: m.personal ? 16 : 28 }}>{MATCH_LINE}</div>
            {m.dateLine && (
              // One flex item per part, so a wrap happens between "12:00 Uhr" and the venue, never inside a word
              <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 26, color: INK_500, marginTop: 12, columnGap: 12 }}>
                {m.dateLine.split(' · ').flatMap((part, i) => (i ? ['·', part] : [part])).map((t, i) => (
                  <div key={i} style={{ display: 'flex' }}>{t}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', width: 320, justifyContent: 'center', alignItems: 'center' }}>
            <Portrait m={m} a={a} />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: a.fonts.length ? a.fonts : undefined },
  )
}
