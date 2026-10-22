'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, ExternalLink, Link2, MessageCircle, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { isCollegeEligible } from '@/components/invites/invite-stats'
import type { InviteStatus, InviteWithPlayer, SchoolType } from '@/types'

const STATUS: Record<InviteStatus, { label: string; cls: string }> = {
  accepted: { label: 'Accepted', cls: 'bg-green-500/15 text-green-700 border-green-500/30' },
  invited: { label: 'No answer yet', cls: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
  declined: { label: 'Declined', cls: 'bg-gray-500/15 text-gray-600 border-gray-500/30' },
}

const SCHOOL: Record<SchoolType, string> = { abitur: 'Abitur', fachabitur: 'Fachabitur', realschule: 'Realschule', other: 'Other' }

const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
  } catch {
    toast.error('Could not copy')
  }
}

interface InviteRowProps {
  invite: InviteWithPlayer
  link: string
  message: string
  waUrl: string | null
  onStatus: (status: 'invited' | 'declined') => void
  onDelete: () => void
}

export const InviteRow = ({ invite, link, message, waUrl, onStatus, onDelete }: InviteRowProps) => {
  const [open, setOpen] = useState(false)
  const p = invite.player
  const status = STATUS[invite.status]
  const yesNo = (v: string | null) => (v ? 'yes' : 'no')

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p?.name ?? invite.name}</h3>
            <Badge className={status.cls}>{status.label}</Badge>
            {p?.position && <Badge variant="outline">{p.position}</Badge>}
            {isCollegeEligible(p) && <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">College-eligible</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Invited by {invite.invited_by}
            {invite.phone ? ` · ${invite.phone}` : ''}
            {invite.responded_at ? ` · answered ${new Date(invite.responded_at).toLocaleDateString('de-DE')}` : ''}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {invite.status !== 'declined' && <DropdownMenuItem onClick={() => onStatus('declined')}>Mark declined (answered on WhatsApp)</DropdownMenuItem>}
            {invite.status !== 'invited' && <DropdownMenuItem onClick={() => onStatus('invited')}>Reset to no answer</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete invite</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => copy(link, 'Link')}><Link2 className="h-4 w-4" />Copy link</Button>
        <Button variant="outline" size="sm" onClick={() => copy(message, 'WhatsApp text')}><Copy className="h-4 w-4" />Copy text</Button>
        {waUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />Open in WhatsApp</a>
          </Button>
        )}
      </div>

      {p && (
        <>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {open ? 'Hide details' : 'Details'}
          </Button>
          {open && (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-3 text-sm sm:grid-cols-3">
              <dt className="text-muted-foreground">Birth year</dt><dd>{p.birth_year ?? '-'}</dd>
              <dt className="text-muted-foreground">Club</dt><dd>{p.club ?? '-'}</dd>
              <dt className="text-muted-foreground">School</dt><dd>{p.school_type ? SCHOOL[p.school_type] : '-'}{p.grad_year ? ` ${p.grad_year}` : ''}</dd>
              <dt className="text-muted-foreground">Grades</dt><dd>{p.grades ?? '-'}</dd>
              <dt className="text-muted-foreground">English</dt><dd>{p.english_level ?? '-'}</dd>
              <dt className="text-muted-foreground">Video</dt>
              <dd>{p.video_url ? <a href={p.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">link <ExternalLink className="h-3 w-3" /></a> : '-'}</dd>
              <dt className="text-muted-foreground">Phone</dt><dd>{p.phone ?? '-'}</dd>
              <dt className="text-muted-foreground">Email</dt><dd className="truncate">{p.email ?? '-'}</dd>
              <dt className="text-muted-foreground">Parent</dt><dd>{p.parent_name ? `${p.parent_name}${p.parent_phone ? `, ${p.parent_phone}` : ''}` : '-'}</dd>
              <dt className="text-muted-foreground">Consent</dt>
              <dd className="col-span-1 sm:col-span-2">profile/college {yesNo(p.consent_profile_at)} · social {yesNo(p.consent_social_at)}</dd>
            </dl>
          )}
        </>
      )}
    </li>
  )
}
