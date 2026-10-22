'use client'

import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InviteForm } from '@/components/invites/invite-form'
import { InviteStats } from '@/components/invites/invite-stats'
import { InviteTable } from '@/components/invites/invite-table'
import { RosterTable } from '@/components/invites/roster-table'
import { useInvites, type NewInviteInput } from '@/hooks/use-invites'
import { useUser } from '@/hooks/use-user'
import { useEvent } from '@/contexts/event-context'

// Staff side of the selection invites: add invites, copy the WhatsApp text, watch the answers, set shirt numbers
export default function InvitesPage() {
  const { currentEvent } = useEvent()
  const { userName } = useUser()
  const { invites, isLoading, error, migrationPending, refetch, createInvites, updateInvite, deleteInvite, setJerseyNumber } = useInvites(currentEvent?.id)

  const handleCreate = async (rows: NewInviteInput[]) => {
    try {
      const created = await createInvites(rows)
      toast.success(created.length === 1 ? 'Invite created' : `${created.length} invites created`)
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invites</h1>
            <p className="text-muted-foreground">
              {currentEvent ? `${currentEvent.name}: personal links, WhatsApp texts and the live overview` : 'Select an event first'}
            </p>
          </div>
          <Button variant="outline" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

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
            <InviteForm defaultInviter={userName ?? ''} disabled={migrationPending || !currentEvent} onCreate={handleCreate} />
            <InviteTable invites={invites} event={currentEvent} isLoading={isLoading} onStatus={handleStatus} onDelete={handleDelete} />
          </TabsContent>
          <TabsContent value="roster" className="pt-2">
            <RosterTable invites={invites} onJersey={handleJersey} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
