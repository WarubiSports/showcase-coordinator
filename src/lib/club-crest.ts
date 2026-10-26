import { normalizeClub } from '@/lib/name-normalize'
import type { FupaInviteStats } from '@/types'

// The club's crest in the photo slot when an invite has a club but no photo (Matthew, 26.10: no FuPa page,
// no upload). The crest comes from FuPa's club search and lives in stats jsonb under club_crest, so no
// migration is needed. Pure; the search itself is in club-crest-server.ts.

const IMAGE_HOST = /^https:\/\/image\.fupa\.net\//
const CREST_SIZE = '100x100.png'

type Hit = Record<string, unknown>
const obj = (v: unknown): Hit | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Hit) : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

// The crest of the first club hit whose normalised name is exactly the club; nothing for a near miss
export const crestFromHits = (hits: unknown[], club: string | null | undefined): string | null => {
  const wanted = normalizeClub(club)
  if (!wanted) return null
  for (const hit of hits) {
    const h = obj(hit)
    if (!h || h.type !== 'club' || normalizeClub(str(h.name)) !== wanted) continue
    const path = str(obj(h.image)?.path)
    if (path && IMAGE_HOST.test(path)) return `${path.replace(/\/?$/, '/')}${CREST_SIZE}`
  }
  return null
}

export interface CrestFields {
  photo_url: string | null
  club: string | null
  stats: FupaInviteStats | null
}

// The club the crest is looked up for: FuPa's team name when the page was read, else the invite's club
export const crestClub = (invite: Pick<CrestFields, 'club' | 'stats'>): string | null => invite.stats?.team ?? invite.club ?? null

// Stats with the crest on them; an invite without FuPa numbers gets an empty season record to carry it
export const withClubCrest = (stats: FupaInviteStats | null, crest: string): FupaInviteStats =>
  stats ? { ...stats, club_crest: crest } : { season: null, games: 0, goals: 0, assists: 0, team: null, league: null, club_crest: crest }

// What the crest step writes: nothing when a photo exists or no crest was found, else the stats with the crest
export const crestDecision = (invite: CrestFields, crest: string | null): { stats: FupaInviteStats } | null => {
  if (invite.photo_url || !crest) return null
  return { stats: withClubCrest(invite.stats, crest) }
}

// What the card shows in the photo slot: the crest only without a photo; null means initials
export const clubCrest = (invite: { photo_url: string | null; stats: { club_crest?: string | null } | null }): string | null =>
  invite.photo_url ? null : invite.stats?.club_crest ?? null

// The staff row prints season numbers only when there are some; a crest-only record carries none
export const hasSeasonStats = (stats: { games: number; season: string | null } | null | undefined): boolean => !!stats && (stats.games > 0 || !!stats.season)
