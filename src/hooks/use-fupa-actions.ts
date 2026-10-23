'use client'

import { toast } from 'sonner'
import type { FupaCandidate, InviteWithPlayer } from '@/types'
import { candidateProfileUrl } from '@/lib/fupa-link'

interface FupaActionsDeps {
  enrichInvite: (id: string) => Promise<InviteWithPlayer>
  findOnFupa: (id: string) => Promise<InviteWithPlayer & { fupa?: { linked: boolean; hits: number } }>
  updateInvite: (id: string, patch: Partial<Pick<InviteWithPlayer, 'profile_url' | 'club' | 'fupa_candidates'>>) => Promise<InviteWithPlayer>
}

// Staff-side FuPa handlers: the page read for a linked invite, and for an invite without a link the search,
// picking a hit, dismissing the hits and editing the club that helps the search
export const useFupaActions = ({ enrichInvite, findOnFupa, updateInvite }: FupaActionsDeps) => {
  // FuPa read for one invite; a failure only means the card keeps what it has
  const enrich = async (id: string, quiet = false) => {
    try {
      const updated = (await enrichInvite(id)) as { enrichment?: { source?: string; failed?: string } }
      if (updated.enrichment?.failed) {
        if (!quiet) toast.error(`FuPa page not readable (${updated.enrichment.failed})`)
        return false
      }
      if (!quiet) toast.success('FuPa data loaded')
      return true
    } catch (err) {
      if (!quiet) toast.error(err instanceof Error ? err.message : 'Could not load FuPa data')
      return false
    }
  }

  const find = async (id: string) => {
    try {
      const updated = await findOnFupa(id)
      if (updated.fupa?.linked) {
        toast.success('FuPa profile linked')
        await enrich(id, true)
      } else {
        toast.message(updated.fupa?.hits ? `FuPa: ${updated.fupa.hits} Treffer, bitte in der Zeile auswählen` : 'FuPa: kein Treffer')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'FuPa search failed')
    }
  }

  const pick = async (id: string, candidate: FupaCandidate) => {
    try {
      await updateInvite(id, { profile_url: candidateProfileUrl(candidate) })
      toast.success('FuPa profile linked')
      await enrich(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the link')
    }
  }

  const dismiss = async (id: string) => {
    try {
      await updateInvite(id, { fupa_candidates: [] })
    } catch {
      toast.error('Could not update invite')
    }
  }

  // A club helps the search tell players of the same name apart, so it runs again for an invite without a link
  const club = async (id: string, value: string | null, hasLink: boolean) => {
    try {
      await updateInvite(id, { club: value })
      toast.success(value ? 'Club saved' : 'Club removed')
      if (!hasLink) await find(id)
    } catch {
      toast.error('Could not save the club')
    }
  }

  return { enrich, find, pick, dismiss, club }
}
