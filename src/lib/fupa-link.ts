import type { FupaCandidate } from '@/types'

// The profile page behind a search hit (client safe; the search itself is server only)
export const candidateProfileUrl = (c: Pick<FupaCandidate, 'link_url'>): string => `https://www.fupa.net${c.link_url}`
