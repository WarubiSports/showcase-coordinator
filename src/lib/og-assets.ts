import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { readCappedBytes } from '@/lib/fupa-fetch'
import { safeBasePhotoUrl } from '@/lib/photo-url'
import type { OgFont } from '@/lib/invite-og-image'

// What the preview image needs from outside: fonts, the two logos, the player's photo. Server only.

// Google Fonts serves TTF to server-side fetches; null means the built-in font (the event preview does the same)
export const loadGoogleFont = async (family: string, weight: OgFont['weight']): Promise<ArrayBuffer | null> => {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, { signal: AbortSignal.timeout(8000) })).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    return url ? await (await fetch(url, { signal: AbortSignal.timeout(8000) })).arrayBuffer() : null
  } catch {
    return null
  }
}

export const loadOgFonts = async (): Promise<OgFont[]> => {
  const wanted: { name: string; weight: OgFont['weight'] }[] = [{ name: 'Kanit', weight: 700 }, { name: 'Inter', weight: 400 }, { name: 'Inter', weight: 600 }]
  const data = await Promise.all(wanted.map((w) => loadGoogleFont(w.name, w.weight)))
  return wanted.flatMap((w, i) => (data[i] ? [{ name: w.name, data: data[i], weight: w.weight, style: 'normal' as const }] : []))
}

const siteOrigin = () => {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  return host ? `https://${host}` : 'http://localhost:3000'
}

// A file from public/ as a data URL; when the function bundle carries no public folder, the site URL serves it
export const publicImage = async (p: string): Promise<string> => {
  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', p))
    return `data:image/png;base64,${bytes.toString('base64')}`
  } catch {
    return `${siteOrigin()}${p}`
  }
}

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png'])

// The player's photo from an allowed host only (image.fupa.net, own storage, athletesusa.org), same 3 MB cap as
// the FuPa read, 8 s; anything else or any failure means initials instead
export const fetchPhotoDataUrl = async (url: string | null | undefined): Promise<string | null> => {
  const safe = safeBasePhotoUrl(url)
  if (!safe) return null
  try {
    const res = await fetch(safe, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
    const type = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
    if (!res.ok || !PHOTO_TYPES.has(type)) return null
    const bytes = await readCappedBytes(res)
    return bytes ? `data:${type};base64,${bytes.toString('base64')}` : null
  } catch {
    return null
  }
}
