import type { FupaResult } from '@/lib/fupa-fetch'

export interface CurrentCardFields {
  photo_url: string | null
  club: string | null
  position: string | null
}

// The update written after a FuPa read. Success: league and stats are FuPa's; photo and club too, except where
// FuPa has none and the invite already has a value (from Base). The position of a Base-linked player stays
// Base's (mapped, "RW") whenever Base has one; FuPa's position only fills a gap. Failure: nothing is written,
// so Base values or an earlier read stay on the card instead of being cleared.
export const enrichUpdate = (result: FupaResult, current: CurrentCardFields, now: string, basePosition: string | null = null): Record<string, unknown> | null => {
  if (!result.ok) return null
  const p = result.profile
  return {
    photo_url: p.photo_url ?? current.photo_url ?? null,
    club: p.club ?? current.club ?? null,
    position: basePosition ?? p.position ?? current.position ?? null,
    league: p.league,
    stats: p.stats,
    enriched_at: now,
    updated_at: now,
  }
}
