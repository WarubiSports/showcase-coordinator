import { isProfileUrl } from '@/lib/profile-url'

// FuPa enrichment for selection invites, parsing half. Same approach as Base's batch-scrape-fupa
// (deployed-stopgap/seasons.mjs): the page embeds window.REDUX_DATA with the player, the current team and
// the seasons. Nothing is guessed: a page without the data yields null and nothing is shown.
// The fetching half (direct fetch, Firecrawl fallback) is in fupa-fetch.ts.

export interface FupaStats {
  season: string | null
  games: number
  goals: number
  assists: number
  team: string | null
  league: string | null
}

export interface FupaProfile {
  photo_url: string | null
  club: string | null
  league: string | null
  position: string | null
  stats: FupaStats | null
}

const MARKER = 'window.REDUX_DATA = '
const FULL_SLUG = /-(\d{4})-\d{2}$/
const HALF_SLUG = /-(?:spring|autumn)(\d{4})$/

const FUPA_HOST = /(^|\.)fupa\.net$/i

export const isFupaUrl = (url: string): boolean => {
  try {
    return isProfileUrl(url) && FUPA_HOST.test(new URL(url).hostname)
  } catch {
    return false
  }
}

// What the server is allowed to fetch: https on a fupa.net host, nothing else (checked again on every redirect hop)
export const fetchableFupaUrl = (url: string): string | null => {
  try {
    const u = new URL(url)
    if (u.protocol === 'http:') u.protocol = 'https:'
    return u.protocol === 'https:' && FUPA_HOST.test(u.hostname) && !u.username && !u.password ? u.toString() : null
  } catch {
    return null
  }
}

// A stored photo must come from fupa.net over https
const safePhotoUrl = (url: string | null): string | null => {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && FUPA_HOST.test(u.hostname) ? u.toString() : null
  } catch {
    return null
  }
}

// Balanced-brace scan from the first "{" after the marker, string and escape aware (as in Base)
const extractObject = (html: string, from: number): string | null => {
  const start = html.indexOf('{', from)
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return html.slice(start, i + 1)
    }
  }
  return null
}

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const int = (v: unknown): number | null => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : null)

const seasonYear = (team: Obj | null): number => {
  const slug = str(team?.slug) ?? ''
  const m = slug.match(FULL_SLUG) ?? slug.match(HALF_SLUG)
  return m ? Number(m[1]) : 0
}

const teamFacts = (team: Obj | null) => {
  const competition = obj(team?.competition)
  return {
    club: str(obj(team?.name)?.full) ?? str(obj(team?.club)?.name),
    league: str(competition?.name),
    season: str(obj(competition?.season)?.name),
  }
}

// Pure: the page HTML to the profile facts. null when the page carries no player data at all.
export const parseFupaHtml = (html: string): FupaProfile | null => {
  if (typeof html !== 'string') return null
  const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
  let data: Obj | null = null
  const at = html.indexOf(MARKER)
  if (at >= 0) {
    try {
      const redux = JSON.parse(extractObject(html, at + MARKER.length) ?? 'null') as Obj | null
      const history = Array.isArray(redux?.dataHistory) ? (redux!.dataHistory as unknown[]) : []
      data = obj(obj(history.map(obj).find((e) => e?.PlayerPage)?.PlayerPage)?.data)
    } catch {
      data = null
    }
  }
  if (!data && !og) return null

  const seasons = (Array.isArray(obj(data?.playerRole)?.seasons) ? (obj(data?.playerRole)!.seasons as unknown[]) : []).map(obj).filter((s): s is Obj => !!s)
  const newest = [...seasons].sort((a, b) => seasonYear(obj(b.team)) - seasonYear(obj(a.team)))[0] ?? null
  const currentTeam = obj(data?.currentTeam) ?? obj(obj(data?.currentRole)?.team) ?? obj(newest?.team)
  const current = teamFacts(currentTeam)
  const statistics = obj(newest?.statistics)
  const games = int(statistics?.matches)
  const stats: FupaStats | null =
    newest && games !== null
      ? { season: teamFacts(obj(newest.team)).season, games, goals: int(statistics?.goals) ?? 0, assists: int(statistics?.assists) ?? 0, ...(({ club, league }) => ({ team: club, league }))(teamFacts(obj(newest.team))) }
      : null
  const imagePath = str(obj(data?.image)?.path)
  return {
    photo_url: safePhotoUrl(og?.[1] ?? null) ?? (imagePath ? safePhotoUrl(`https://image.fupa.net/${imagePath.replace(/^\//, '')}/960x1200.jpeg`) : null),
    club: current.club,
    league: current.league,
    position: str(obj(data?.currentRole)?.position) ?? str(data?.position),
    stats,
  }
}
