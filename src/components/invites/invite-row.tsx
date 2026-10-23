'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, ExternalLink, Link2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InviteRowMenu } from '@/components/invites/invite-row-menu'
import { FupaPicker } from '@/components/invites/fupa-picker'
import { isCollegeEligible } from '@/components/invites/invite-stats'
import { PROFILE_URL_ERROR, isProfileUrl } from '@/lib/profile-url'
import { CATEGORY, SCHOOL, STATUS } from '@/components/invites/invite-badges'
import type { FupaCandidate, InviteCategory, InviteWithPlayer } from '@/types'

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
  selected: boolean
  onSelect: (selected: boolean) => void
  onStatus: (status: 'invited' | 'declined') => void
  onProfileUrl: (url: string | null) => void
  onCategory: (category: InviteCategory) => void
  onEnrich: () => void
  onBaseSync: () => void
  onFindFupa: () => void
  onPickFupa: (candidate: FupaCandidate) => void
  onDismissFupa: () => void
  onClub: (club: string | null) => void
  onDelete: () => void
}

export const InviteRow = ({ invite, link, message, waUrl, selected, onSelect, onStatus, onProfileUrl, onCategory, onEnrich, onBaseSync, onFindFupa, onPickFupa, onDismissFupa, onClub, onDelete }: InviteRowProps) => {
  const [open, setOpen] = useState(false)
  const p = invite.player
  const status = STATUS[invite.status]
  const yesNo = (v: string | null) => (v ? 'yes' : 'no')

  // Edit the FuPa / Transfermarkt link in place; an empty value clears it
  const editProfileUrl = () => {
    const v = window.prompt('Profil-Link (FuPa oder Transfermarkt)', invite.profile_url ?? '')
    if (v === null) return
    const url = v.trim()
    if (url && !isProfileUrl(url)) { toast.error(PROFILE_URL_ERROR); return }
    onProfileUrl(url || null)
  }
  const editClub = () => {
    const v = window.prompt('Verein', invite.club ?? '')
    if (v !== null) onClub(v.trim() || null)
  }

  return (
    <li className={`rounded-lg border bg-card p-4 ${selected ? 'border-primary/50 bg-primary/5' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          aria-label={`Select ${invite.name} for the coach message`}
          className="mt-1 h-5 w-5 shrink-0 accent-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p?.name ?? invite.name}</h3>
            <Badge className={status.cls}>{status.label}</Badge>
            {invite.category && <Badge className={CATEGORY[invite.category].cls}>{CATEGORY[invite.category].label}</Badge>}
            {p?.position && <Badge variant="outline">{p.position}</Badge>}
            {isCollegeEligible(p) && <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">College-eligible</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Invited by {invite.invited_by}
            {invite.phone ? ` · ${invite.phone}` : ''}
            {invite.responded_at ? ` · answered ${new Date(invite.responded_at).toLocaleDateString('de-DE')}` : ''}
            {invite.ausa_athlete_id ? ' · linked to Base' : ''}
          </p>
          {invite.profile_url && (
            <a href={invite.profile_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-blue-700 underline">
              <ExternalLink className="h-3.5 w-3.5" />
              {/fupa\.net/i.test(invite.profile_url) ? 'FuPa profile' : 'Transfermarkt profile'}
            </a>
          )}
          {!invite.profile_url && Array.isArray(invite.fupa_candidates) && <FupaPicker candidates={invite.fupa_candidates} onPick={onPickFupa} onDismiss={onDismissFupa} />}
          {(invite.enriched_at || invite.photo_url || invite.club || invite.position) && (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {invite.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={invite.photo_url} alt="" className="h-7 w-7 rounded-full object-cover object-top" />
              )}
              <span className="truncate">
                {invite.enriched_at ? 'FuPa' : 'Base'}: {[invite.club, invite.league, invite.position].filter(Boolean).join(' · ')}
                {invite.stats ? ` · ${invite.stats.games} Sp. ${invite.stats.goals} T. ${invite.stats.assists} V.${invite.stats.season ? ` (${invite.stats.season})` : ''}` : ''}
              </span>
            </p>
          )}
        </div>
        <InviteRowMenu invite={invite} onStatus={onStatus} onEditProfileUrl={editProfileUrl} onCategory={onCategory} onEnrich={onEnrich} onBaseSync={onBaseSync} onFindFupa={onFindFupa} onEditClub={editClub} onDelete={onDelete} />
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
