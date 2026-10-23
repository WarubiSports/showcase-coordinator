import type { FupaCandidate } from '@/types'
import { readCapped } from '@/lib/fupa-fetch'

export { candidateProfileUrl } from '@/lib/fupa-link'

// FuPa's public player search (search.fupa.net, the endpoint Base's fupa-discover-urls.js uses), server side.
// Same rules as the page read: https on fupa.net only, desktop User-Agent, body cap, timeout. Only hits whose
// normalised name equals the invite name count; the caller decides whether one of them is the player.

const SEARCH = 'https://search.fupa.net/v2/query'
const IMAGE_HOST = /^https:\/\/image\.fupa\.net\//
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

// Names as Base's matcher compares them (case, spaces and hyphens ignored), plus German umlaut folding so
// "Müller" and "Mueller" meet; other accents are stripped.
export const normalizeName = (s: string | null | undefined): string =>
  (s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\s\-'’.]+/g, '')

// Club names: same folding, letters and digits only ("SSV Jan Wellem 05" and "Jan Wellem" meet as substrings)
export const normalizeClub = (s: string | null | undefined): string => normalizeName(s).replace(/[^a-z0-9]/g, '')

type Hit = Record<string, unknown>
const obj = (v: unknown): Hit | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Hit) : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
// FuPa image paths are base URLs ("https://image.fupa.net/player/<id>/"); a size suffix makes them a file
const image = (v: unknown, size: string): string | null => {
  const path = str(obj(v)?.path)
  return path && IMAGE_HOST.test(path) ? `${path.replace(/\/?$/, '/')}${size}` : null
}

export const toCandidate = (hit: unknown): FupaCandidate | null => {
  const h = obj(hit)
  const linkUrl = str(h?.linkUrl)
  const id = num(h?.id)
  const name = str(h?.name)
  if (!h || h.type !== 'player' || !linkUrl?.startsWith('/player/') || id === null || !name) return null
  const club = obj(h.club)
  const birth = str(h.birthday)?.match(/^(19|20)\d{2}/)?.[0]
  return {
    id,
    name,
    link_url: linkUrl,
    position: str(h.position),
    image: image(h.image, '960x1200.jpeg'),
    club: str(club?.name),
    club_image: image(club?.image, '100x100.png'),
    level: num(h.level),
    region: str(obj(h.region)?.name),
    district: str(obj(h.district)?.name),
    birth_year: birth ? Number(birth) : null,
    score: num(h.score) ?? 0,
  }
}

// The hits that are this name, best score first
export const candidatesFor = (hits: unknown[], name: string): FupaCandidate[] => {
  const wanted = normalizeName(name)
  if (!wanted) return []
  return hits
    .map(toCandidate)
    .filter((c): c is FupaCandidate => !!c && normalizeName(c.name) === wanted)
    .sort((a, b) => b.score - a.score)
}

// One hit is the player when it is the only one, or when the club staff typed singles it out
// (substring both ways on normalised club names). Otherwise nobody is picked.
export const pickCandidate = (candidates: FupaCandidate[], clubText: string | null | undefined): FupaCandidate | null => {
  if (candidates.length === 1) return candidates[0]
  const typed = normalizeClub(clubText)
  if (candidates.length < 2 || !typed) return null
  const byClub = candidates.filter((c) => {
    const club = normalizeClub(c.club)
    return !!club && (club.includes(typed) || typed.includes(club))
  })
  return byClub.length === 1 ? byClub[0] : null
}

// null = search not reachable (nothing is stored then); [] = no hit for this name
export const searchFupaPlayers = async (name: string): Promise<FupaCandidate[] | null> => {
  const q = name.trim()
  if (q.length < 3) return []
  try {
    const res = await fetch(`${SEARCH}?q=${encodeURIComponent(q)}&type=player`, {
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'de-DE,de;q=0.9' },
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = await readCapped(res)
    const hits = body ? (JSON.parse(body) as unknown) : null
    return Array.isArray(hits) ? candidatesFor(hits, q) : null
  } catch {
    return null
  }
}
