'use client'

import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { InvitesHeader } from '@/components/invites/invites-header'
import { InvitesNotices } from '@/components/invites/invites-notices'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InviteForm } from '@/components/invites/invite-form'
import { InviteStats } from '@/components/invites/invite-stats'
import { InviteTable } from '@/components/invites/invite-table'
import { RosterTable } from '@/components/invites/roster-table'
import { useInvites, type NewInviteInput } from '@/hooks/use-invites'
import { useUser } from '@/hooks/use-user'
import { useStaff } from '@/hooks/use-staff'
import { useFupaActions } from '@/hooks/use-fupa-actions'
import { isTemplateEvent } from '@/lib/default-event'
import { useEvent } from '@/contexts/event-context'

// Staff side of the selection invites: add invites, copy the WhatsApp text, watch the answers, set shirt numbers
export default function InvitesPage() {
  const { currentEvent } = useEvent()
  const { userName } = useUser()
  const { staff, firstName: staffFirstName, signOut } = useStaff()
  // With a Staff App login the inviter defaults to that first name; under basic auth to the welcome-dialog name
  const defaultInviter = staffFirstName || userName || ''
  const { invites, isLoading, error, migrationPending, refetch, createInvites, updateInvite, deleteInvite, enrichInvite, findOnFupa, syncFromBase, setJerseyNumber } = useInvites(currentEvent?.id)

  const fupa = useFupaActions({ enrichInvite, findOnFupa, updateInvite })
  const handleEnrich = fupa.enrich

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

  // Base values first, then the FuPa read on top when the link is a FuPa page
  const handleBaseSync = async (id: string) => {
    try {
      const updated = await syncFromBase(id)
      toast.success('Base data synced')
      if (updated.profile_url && /fupa\.net/i.test(updated.profile_url)) await handleEnrich(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sync from Base')
    }
  }

  const handleJersey = async (inviteId: string, n: number | null) => {
    try {
      await setJerseyNumber(inviteId, n)
    } catch {
      toast.error('Could not save the number')
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-24">
        <InvitesHeader eventName={currentEvent?.name ?? null} isLoading={isLoading} staff={staff} onRefresh={refetch} onSignOut={signOut} />
        <InvitesNotices templateEvent={!!currentEvent && isTemplateEvent(currentEvent)} migrationPending={migrationPending} error={error} />

        <InviteStats invites={invites} />

        <Tabs defaultValue="invites">
          <TabsList>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
          </TabsList>
          <TabsContent value="invites" className="space-y-6 pt-2">
            <InviteForm key={defaultInviter} defaultInviter={defaultInviter} staffName={staff ? staffFirstName || null : null} disabled={migrationPending || !currentEvent} onCreate={handleCreate} />
            <InviteTable
              invites={invites}
              event={currentEvent}
              sender={defaultInviter}
              isLoading={isLoading}
              onStatus={handleStatus}
              onProfileUrl={handleProfileUrl}
              onCategory={handleCategory}
              onEnrich={(id) => handleEnrich(id)}
              onBaseSync={handleBaseSync}
              onFindFupa={fupa.find}
              onPickFupa={fupa.pick}
              onDismissFupa={fupa.dismiss}
              onClub={(id, club) => fupa.club(id, club, invites.some((i) => i.id === id && !!i.profile_url))}
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
