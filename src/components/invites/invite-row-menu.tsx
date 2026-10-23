'use client'

import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { InviteCategory, InviteWithPlayer } from '@/types'

interface InviteRowMenuProps {
  invite: InviteWithPlayer
  onStatus: (status: 'invited' | 'declined') => void
  onEditProfileUrl: () => void
  onCategory: (category: InviteCategory) => void
  onEnrich: () => void
  onBaseSync: () => void
  onFindFupa: () => void
  onEditClub: () => void
  onDelete: () => void
}

// The row's "More" menu: answers, profile link, FuPa and Base reads, category, delete
export const InviteRowMenu = ({ invite, onStatus, onEditProfileUrl, onCategory, onEnrich, onBaseSync, onFindFupa, onEditClub, onDelete }: InviteRowMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Mehr"><MoreHorizontal className="h-4 w-4" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {invite.status !== 'declined' && <DropdownMenuItem onClick={() => onStatus('declined')}>Als abgesagt markieren (per WhatsApp geantwortet)</DropdownMenuItem>}
      {invite.status !== 'invited' && <DropdownMenuItem onClick={() => onStatus('invited')}>Zurück auf keine Antwort</DropdownMenuItem>}
      <DropdownMenuItem onClick={onEditProfileUrl}>{invite.profile_url ? 'Profil-Link ändern' : 'Profil-Link hinzufügen'}</DropdownMenuItem>
      {invite.profile_url && /fupa\.net/i.test(invite.profile_url) && <DropdownMenuItem onClick={onEnrich}>FuPa-Daten neu laden</DropdownMenuItem>}
      {!invite.profile_url && <DropdownMenuItem onClick={onFindFupa}>Auf FuPa suchen</DropdownMenuItem>}
      <DropdownMenuItem onClick={onEditClub}>{invite.club ? 'Verein ändern' : 'Verein hinzufügen'}</DropdownMenuItem>
      {invite.ausa_athlete_id && <DropdownMenuItem onClick={onBaseSync}>Aus Base übernehmen</DropdownMenuItem>}
      <DropdownMenuItem onClick={() => onCategory(invite.category === 'signed' ? 'new' : 'signed')}>
        {invite.category === 'signed' ? 'Als Neu markieren' : 'Als Signed markieren (Athletes USA)'}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive" onClick={onDelete}>Einladung löschen</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
