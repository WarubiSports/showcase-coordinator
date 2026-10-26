'use client'

import { hasSeasonStats } from '@/lib/club-crest'
import type { InviteWithPlayer } from '@/types'

// The row's line under the name: photo or crest, source, club, league, position, numbers when there are some
export const InviteClubLine = ({ invite }: { invite: InviteWithPlayer }) => {
  if (!(invite.enriched_at || invite.photo_url || invite.club || invite.position)) return null
  return (
    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
      {invite.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={invite.photo_url} alt="" className="h-7 w-7 rounded-full object-cover object-top" />
      )}
      <span className="truncate">
        {invite.enriched_at ? 'FuPa' : 'Base'}:{' '}
        {invite.stats?.club_crest && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={invite.stats.club_crest} alt="" className="mr-1 inline-block h-4 w-4 align-text-bottom object-contain" />
        )}
        {[invite.club, invite.league, invite.position].filter(Boolean).join(' · ')}
        {hasSeasonStats(invite.stats) && invite.stats ? ` · ${invite.stats.games} Sp. ${invite.stats.goals} T. ${invite.stats.assists} V.${invite.stats.season ? ` (${invite.stats.season})` : ''}` : ''}
        {invite.stats?.career && invite.stats.career.games > 0 ? ` · Karriere ${invite.stats.career.games} Sp. ${invite.stats.career.goals} T.` : ''}
      </span>
    </p>
  )
}
