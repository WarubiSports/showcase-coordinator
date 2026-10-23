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
  onDelete: () => void
}

// The row's "More" menu: answers, profile link, FuPa and Base reads, category, delete
export const InviteRowMenu = ({ invite, onStatus, onEditProfileUrl, onCategory, onEnrich, onBaseSync, onDelete }: InviteRowMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {invite.status !== 'declined' && <DropdownMenuItem onClick={() => onStatus('declined')}>Mark declined (answered on WhatsApp)</DropdownMenuItem>}
      {invite.status !== 'invited' && <DropdownMenuItem onClick={() => onStatus('invited')}>Reset to no answer</DropdownMenuItem>}
      <DropdownMenuItem onClick={onEditProfileUrl}>{invite.profile_url ? 'Edit profile link' : 'Add profile link'}</DropdownMenuItem>
      {invite.profile_url && /fupa\.net/i.test(invite.profile_url) && <DropdownMenuItem onClick={onEnrich}>Reload FuPa data</DropdownMenuItem>}
      {invite.ausa_athlete_id && <DropdownMenuItem onClick={onBaseSync}>Sync from Base</DropdownMenuItem>}
      <DropdownMenuItem onClick={() => onCategory(invite.category === 'signed' ? 'new' : 'signed')}>
        {invite.category === 'signed' ? 'Mark as new' : 'Mark as signed (Athletes USA)'}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete invite</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
