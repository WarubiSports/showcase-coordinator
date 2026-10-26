import type { InviteStatus, InviteWithPlayer } from '@/types'
import { normalizeName } from './name-normalize'

export type InviteSortKey = 'status' | 'name' | 'inviter' | 'club'

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true })
const statusOrder: Record<InviteStatus, number> = { accepted: 0, invited: 1, declined: 2 }

// Use the enriched/edited club first, then the club supplied at sign-up.
export const inviteClub = (invite: InviteWithPlayer): string =>
  invite.club?.trim() || invite.player?.club?.trim() || ''

export const visibleInvites = (invites: InviteWithPlayer[], query: string, sort: InviteSortKey): InviteWithPlayer[] => {
  const terms = query.trim().split(/\s+/).map(normalizeName).filter(Boolean)
  return invites.filter((invite) => {
    const fields = [invite.name, invite.player?.name, inviteClub(invite)].map(normalizeName)
    return terms.every((term) => fields.some((field) => field.includes(term)))
  }).sort((a, b) => {
    if (sort === 'status' && a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status]
    if (sort === 'inviter') {
      const byInviter = collator.compare(a.invited_by, b.invited_by)
      if (byInviter) return byInviter
    }
    if (sort === 'club') {
      const clubA = inviteClub(a)
      const clubB = inviteClub(b)
      // Missing clubs belong at the end, rather than before the first club.
      if (!clubA && clubB) return 1
      if (clubA && !clubB) return -1
      const byClub = collator.compare(clubA, clubB)
      if (byClub) return byClub
    }
    return collator.compare(a.player?.name || a.name, b.player?.name || b.name) || collator.compare(a.id, b.id)
  })
}
