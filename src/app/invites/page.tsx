'use client'

import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { InvitesHeader } from '@/components/invites/invites-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InviteForm } from '@/components/invites/invite-form'
import { InviteStats } from '@/components/invites/invite-stats'
import { InviteTable } from '@/components/invites/invite-table'
import { RosterTable } from '@/components/invites/roster-table'
import { useInvites, type NewInviteInput } from '@/hooks/use-invites'
import { useUser } from '@/hooks/use-user'
import { useStaff } from '@/hooks/use-staff'
import { useEvent } from '@/contexts/event-context'

// Staff side of the selection invites: add invites, copy the WhatsApp text, watch the answers, set shirt numbers
export default function InvitesPage() {
  const { currentEvent } = useEvent()
  const { userName } = useUser()
  const { staff, firstName: staffFirstName, signOut } = useStaff()
  // With a Staff App login the inviter defaults to that first name; under basic auth to the welcome-dialog name
  const defaultInviter = staffFirstName || userName || ''
  const { invites, isLoading, error, migrationPending, refetch, createInvites, updateInvite, deleteInvite, enrichInvite, setJerseyNumber } = useInvites(currentEvent?.id)

  // FuPa read for one invite; a failure only means the card stays hidden
  const handleEnrich = async (id: string, quiet = false) => {
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

  const handleCreate = async (rows: NewInviteInput[]) => {
    try {
      const created = await createInvites(rows)
      toast.success(created.length === 1 ? 'Invite created' : `${created.length} invites created`)
      const withLink = created.filter((i) => i.profile_url && /fupa\.net/i.test(i.profile_url))
      let loaded = 0
      for (const i of withLink) if (await handleEnrich(i.id, true)) loaded++
      if (withLink.length) toast.message(`FuPa data loaded for ${loaded} of ${withLink.length}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create invites')
      throw err
    }
  }

  const handleStatus = async (id: string, status: 'invited' | 'declined') => {
    try {
      await updateInvite(id, { status })
      toast.success(status === 'declined' ? 'Marked as declined' : 'Reset to no answer')
    } catch {
      toast.error('Could not update invite')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invite? The link stops working. A sign-up already made stays on the Players page.')) return
    try {
      await deleteInvite(id)
      toast.success('Invite deleted')
    } catch {
      toast.error('Could not delete invite')
    }
  }

  const handleProfileUrl = async (id: string, url: string | null) => {
    try {
      await updateInvite(id, { profile_url: url })
      toast.success(url ? 'Profile link saved' : 'Profile link removed')
      if (url && /fupa\.net/i.test(url)) await handleEnrich(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the link')
    }
  }

  const handleCategory = async (id: string, category: 'signed' | 'new') => {
    try {
      await updateInvite(id, { category })
      toast.success(category === 'signed' ? 'Marked as signed' : 'Marked as new')
    } catch {
      toast.error('Could not update the category')
    }
  }

  const handleJersey = async (playerId: string, n: number | null) => {
    try {
      await setJerseyNumber(playerId, n)
    } catch {
      toast.error('Could not save the number')
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <InvitesHeader eventName={currentEvent?.name ?? null} isLoading={isLoading} staff={staff} onRefresh={refetch} onSignOut={signOut} />

        {migrationPending && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Invites are not set up in the database yet. Apply migration <code>20261022000001_selection_invites.sql</code> and refresh.
          </div>
        )}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        <InviteStats invites={invites} />

        <Tabs defaultValue="invites">
          <TabsList>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
          </TabsList>
          <TabsContent value="invites" className="space-y-6 pt-2">
            <InviteForm key={defaultInviter} defaultInviter={defaultInviter} disabled={migrationPending || !currentEvent} onCreate={handleCreate} />
            <InviteTable
              invites={invites}
              event={currentEvent}
              sender={defaultInviter}
              isLoading={isLoading}
              onStatus={handleStatus}
              onProfileUrl={handleProfileUrl}
              onCategory={handleCategory}
              onEnrich={(id) => handleEnrich(id)}
              onDelete={handleDelete}
            />
          </TabsContent>
          <TabsContent value="roster" className="pt-2">
            <RosterTable invites={invites} onJersey={handleJersey} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
