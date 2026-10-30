import { isProfileUrl } from '@/lib/profile-url'

// FuPa enrichment for selection invites, parsing half. Same approach as Base's batch-scrape-fupa
// (deployed-stopgap/seasons.mjs): the page embeds window.REDUX_DATA with the player, the current team and
// the seasons. Nothing is guessed: a page without the data yields null and nothing is shown.
// The fetching half (direct fetch, Firecrawl fallback) is in fupa-fetch.ts.

// Totals over every season on the page (seasons = those with a games number); null when no season has numbers
export interface FupaCareer {
  games: number
  goals: number
  assists: number
  seasons: number
}

// The men's team row of the same season, kept next to the youth row the card is built on
export interface FupaSeniorLine {
  team: string | null
  league: string | null
  season: string | null
  games: number
  goals: number
  assists: number
}

export interface FupaStats {
  season: string | null
  games: number
  goals: number
  assists: number
  team: string | null
  league: string | null
  career: FupaCareer | null
  senior?: FupaSeniorLine
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

// FuPa tags every team with an age group: { slug: 'm', name: 'Herren' } for the men's teams, { slug: 'u19-', name:
// 'A-Jugend (U19)' } for the youth sides. Youth is recognised by what it is, so a group nobody has seen yet
// (Frauen, Alte Herren) is neither youth nor the men's line and the old newest-season logic applies to it.
const ageGroup = (team: Obj | null): { slug: string; name: string } => {
  const group = obj(team?.ageGroup)
  return { slug: str(group?.slug)?.toLowerCase() ?? '', name: str(group?.name) ?? '' }
}
const isYouth = (team: Obj | null): boolean => {
  const { slug, name } = ageGroup(team)
  return /^u\d+/.test(slug) || /\(U\d+\)|jugend|junioren|juniorinnen/i.test(name)
}
const isMens = (team: Obj | null): boolean => {
  const { slug, name } = ageGroup(team)
  return slug === 'm' || /^herren$/i.test(name)
}

// The row with the most games; the first one wins a tie, and a row without a games number is no candidate.
// FuPa lists a qualification round next to the real league season (0 games), which must not win.
const mostGames = (rows: Obj[]): Obj | null =>
  rows.reduce<Obj | null>((best, row) => {
    const g = int(obj(row.statistics)?.matches)
    if (g === null) return best
    return !best || g > (int(obj(best.statistics)?.matches) ?? -1) ? row : best
  }, null)

// Every season with a games number counts; a season without numbers is skipped
export const careerTotals = (seasons: Obj[]): FupaCareer | null => {
  const totals = { games: 0, goals: 0, assists: 0, seasons: 0 }
  for (const season of seasons) {
    const st = obj(season.statistics)
    const g = int(st?.matches)
    if (g === null) continue
    totals.games += g
    totals.goals += int(st?.goals) ?? 0
    totals.assists += int(st?.assists) ?? 0
    totals.seasons += 1
  }
  return totals.seasons > 0 ? totals : null
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
  const bySeasonDesc = [...seasons].sort((a, b) => seasonYear(obj(b.team)) - seasonYear(obj(a.team)))
  const latest = bySeasonDesc[0] ?? null
  // The card is built on the youth row of the newest season when there is one: a player of the U19 who also
  // plays for the club's men's team gets the U19 league on the card, the men's numbers go on a second line.
  // A newest season without a youth row (a player past youth football) keeps the old logic: the first row.
  const newestYear = seasonYear(obj(latest?.team ?? null))
  const newestRows = newestYear > 0 ? bySeasonDesc.filter((s) => seasonYear(obj(s.team)) === newestYear) : []
  const youth = mostGames(newestRows.filter((s) => isYouth(obj(s.team))))
  const newest = youth ?? latest
  const mens = youth ? mostGames(newestRows.filter((s) => isMens(obj(s.team)))) : null
  const currentTeam = obj(data?.currentTeam) ?? obj(obj(data?.currentRole)?.team) ?? obj(newest?.team)
  const current = teamFacts(currentTeam)
  const newestTeam = obj(newest?.team)
  const played = teamFacts(newestTeam)
  const statistics = obj(newest?.statistics)
  const games = int(statistics?.matches)
  const stats: FupaStats | null =
    newest && games !== null
      ? { season: played.season, games, goals: int(statistics?.goals) ?? 0, assists: int(statistics?.assists) ?? 0, team: played.club, league: played.league, career: careerTotals(seasons) }
      : null
  if (stats && mens) {
    const facts = teamFacts(obj(mens.team))
    const st = obj(mens.statistics)
    stats.senior = { team: facts.club, league: facts.league, season: facts.season, games: int(st?.matches) ?? 0, goals: int(st?.goals) ?? 0, assists: int(st?.assists) ?? 0 }
  }
  // The club's first team (currentTeam) can sit in a higher league than the team the player actually plays
  // for (a reserve side, say). The newest season's team and league are what the card and the staff line show;
  // the club's competition is only the fallback when that season carries no league or is older than the current team.
  const seasonIsCurrent = !!played.league && (seasonYear(newestTeam) >= seasonYear(currentTeam) || seasonYear(currentTeam) === 0)
  const imagePath = str(obj(data?.image)?.path)
  return {
    photo_url: safePhotoUrl(og?.[1] ?? null) ?? (imagePath ? safePhotoUrl(`https://image.fupa.net/${imagePath.replace(/^\//, '')}/960x1200.jpeg`) : null),
    club: seasonIsCurrent ? (played.club ?? current.club) : current.club,
    league: seasonIsCurrent ? played.league : current.league,
    position: str(obj(data?.currentRole)?.position) ?? str(data?.position),
    stats,
  }
}
