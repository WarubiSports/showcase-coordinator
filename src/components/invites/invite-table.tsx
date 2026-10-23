'use client'

import { useState, useSyncExternalStore } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { InviteRow } from '@/components/invites/invite-row'
import { CoachBundleBar } from '@/components/invites/coach-bundle-bar'
import { buildWhatsAppMessage, inviteLink, whatsAppUrl, type CoachMessageEvent } from '@/lib/invite-message'
import type { InviteStatus, InviteWithPlayer } from '@/types'

type SortKey = 'status' | 'name' | 'inviter'
const subscribeNothing = () => () => {}
const STATUS_ORDER: Record<InviteStatus, number> = { accepted: 0, invited: 1, declined: 2 }

const sortInvites = (invites: InviteWithPlayer[], key: SortKey): InviteWithPlayer[] =>
  [...invites].sort((a, b) => {
    if (key === 'status' && STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (key === 'inviter' && a.invited_by !== b.invited_by) return a.invited_by.localeCompare(b.invited_by)
    return a.name.localeCompare(b.name)
  })

interface InviteTableProps {
  invites: InviteWithPlayer[]
  event: CoachMessageEvent | null
  sender: string
  isLoading: boolean
  onStatus: (id: string, status: 'invited' | 'declined') => void
  onProfileUrl: (id: string, url: string | null) => void
  onDelete: (id: string) => void
}

export const InviteTable = ({ invites, event, sender, isLoading, onStatus, onProfileUrl, onDelete }: InviteTableProps) => {
  const [sort, setSort] = useState<SortKey>('status')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  // Links carry the deployment's own origin (preview or production); empty during SSR, filled on the client
  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => '')

  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
  }
  if (invites.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No invites yet for this event.</div>
  }

  const forCoach = invites.filter((i) => selected.has(i.id)).map((i) => ({ name: i.name, link: inviteLink(origin, i.token) }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{invites.length} {invites.length === 1 ? 'invite' : 'invites'}</h2>
          <p className="text-xs text-muted-foreground">Tick players to build one message for their club coach.</p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Sort by status</SelectItem>
            <SelectItem value="name">Sort by name</SelectItem>
            <SelectItem value="inviter">Sort by inviter</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {forCoach.length > 0 && <CoachBundleBar players={forCoach} event={event} sender={sender} onClear={() => setSelected(new Set())} />}
      <ul className="space-y-3">
        {sortInvites(invites, sort).map((invite) => {
          const link = inviteLink(origin, invite.token)
          const message = event
            ? buildWhatsAppMessage({ name: invite.name, personalLine: invite.personal_line, sender: invite.invited_by, link, event })
            : link
          return (
            <InviteRow
              key={invite.id}
              invite={invite}
              link={link}
              message={message}
              waUrl={whatsAppUrl(invite.phone, message)}
              selected={selected.has(invite.id)}
              onSelect={(on) => toggle(invite.id, on)}
              onStatus={(status) => onStatus(invite.id, status)}
              onProfileUrl={(url) => onProfileUrl(invite.id, url)}
              onDelete={() => onDelete(invite.id)}
            />
          )
        })}
      </ul>
    </div>
  )
}
