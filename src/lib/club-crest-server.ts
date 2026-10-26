import { searchFupaClubs } from '@/lib/fupa-search'
import { crestClub, crestDecision, crestFromHits, type CrestFields } from '@/lib/club-crest'
import type { FupaInviteStats } from '@/types'

// The crest for a club name, through FuPa's public club search; null when not found or not reachable
export const resolveClubCrest = async (club: string | null | undefined): Promise<string | null> => {
  const q = club?.trim()
  if (!q) return null
  const hits = await searchFupaClubs(q)
  return hits ? crestFromHits(hits, q) : null
}

// The stats patch for an invite that has a club but no photo; null when nothing is to be written
export const crestUpdateFor = async (invite: CrestFields): Promise<{ stats: FupaInviteStats } | null> => {
  if (invite.photo_url) return null
  const club = crestClub(invite)
  if (!club) return null
  return crestDecision(invite, await resolveClubCrest(club))
}
