'use client'

import { useState, useSyncExternalStore } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { InviteRow } from '@/components/invites/invite-row'
import { CoachBundleBar } from '@/components/invites/coach-bundle-bar'
import { buildWhatsAppMessage, inviteLink, whatsAppUrl, type CoachMessageEvent } from '@/lib/invite-message'
import { visibleInvites, type InviteSortKey } from '@/lib/invite-list'
import type { FupaCandidate, InviteCategory, InviteWithPlayer } from '@/types'

const subscribeNothing = () => () => {}

interface InviteTableProps {
  invites: InviteWithPlayer[]
  event: CoachMessageEvent | null
  sender: string
  isLoading: boolean
  onStatus: (id: string, status: 'invited' | 'declined') => void
  onProfileUrl: (id: string, url: string | null) => void
  onCategory: (id: string, category: InviteCategory) => void
  onEnrich: (id: string) => void
  onBaseSync: (id: string) => void
  onCrest: (id: string) => void
  onFindFupa: (id: string) => void
  onPickFupa: (id: string, candidate: FupaCandidate) => void
  onDismissFupa: (id: string) => void
  onClub: (id: string, club: string | null) => void
  onDelete: (id: string) => void
}

export const InviteTable = ({ invites, event, sender, isLoading, onStatus, onProfileUrl, onCategory, onEnrich, onBaseSync, onFindFupa, onPickFupa, onDismissFupa, onClub, onCrest, onDelete }: InviteTableProps) => {
  const [sort, setSort] = useState<InviteSortKey>('status')
  const [query, setQuery] = useState('')
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
    return <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Noch keine Einladungen für dieses Event.</div>
  }

  const forCoach = invites.filter((i) => selected.has(i.id)).map((i) => ({ name: i.name, link: inviteLink(origin, i.token) }))
  const visible = visibleInvites(invites, query, sort)
  const visibleIds = new Set(visible.map((i) => i.id))
  const hiddenSelected = invites.filter((i) => selected.has(i.id) && !visibleIds.has(i.id)).length

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold" aria-live="polite">
            {query.trim() ? `${visible.length} von ${invites.length} Einladungen` : `${invites.length} ${invites.length === 1 ? 'Einladung' : 'Einladungen'}`}
          </h2>
          <p className="text-xs text-muted-foreground">Spieler anhaken, um eine Nachricht für ihren Vereinstrainer zu bauen.</p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as InviteSortKey)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Einladungen sortieren"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Nach Status</SelectItem>
            <SelectItem value="name">Nach Name</SelectItem>
            <SelectItem value="inviter">Nach Einlader</SelectItem>
            <SelectItem value="club">Nach Verein</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Spieler oder Verein suchen …" aria-label="Spieler oder Verein suchen" className="pl-9 pr-12 [&::-webkit-search-cancel-button]:appearance-none" />
        {query && <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label="Suche löschen"><X className="h-4 w-4" /></Button>}
      </div>
      {forCoach.length > 0 && <CoachBundleBar players={forCoach} event={event} sender={sender} onClear={() => setSelected(new Set())} />}
      {hiddenSelected > 0 && <p className="text-sm text-muted-foreground">
        {hiddenSelected === 1 ? 'Ein ausgewählter Spieler ist durch die Suche ausgeblendet und bleibt' : `${hiddenSelected} ausgewählte Spieler sind durch die Suche ausgeblendet und bleiben`} in der Coach-Nachricht.
      </p>}
      {visible.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Keine Spieler oder Vereine gefunden. Versuche einen anderen Suchbegriff.</div>}
      <ul className="space-y-3">
        {visible.map((invite) => {
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
              onCategory={(c) => onCategory(invite.id, c)}
              onEnrich={() => onEnrich(invite.id)}
              onBaseSync={() => onBaseSync(invite.id)}
              onCrest={() => onCrest(invite.id)}
              onFindFupa={() => onFindFupa(invite.id)}
              onPickFupa={(c) => onPickFupa(invite.id, c)}
              onDismissFupa={() => onDismissFupa(invite.id)}
              onClub={(club) => onClub(invite.id, club)}
              onDelete={() => onDelete(invite.id)}
            />
          )
        })}
      </ul>
    </div>
  )
}
