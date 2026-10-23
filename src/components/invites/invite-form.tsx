'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { NewInviteInput } from '@/hooks/use-invites'
import { parseInviteLines } from '@/lib/invite-lines'
import { PROFILE_URL_ERROR, isProfileUrl } from '@/lib/profile-url'
import { AthleteLookup, type AthleteMatch } from '@/components/invites/athlete-lookup'
import { InviteModeToggle, type InviteMode } from '@/components/invites/invite-mode-toggle'

interface InviteFormProps {
  defaultInviter: string
  disabled?: boolean
  onCreate: (rows: NewInviteInput[]) => Promise<void>
}

export const InviteForm = ({ defaultInviter, disabled, onCreate }: InviteFormProps) => {
  const [mode, setMode] = useState<InviteMode>('single')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [club, setClub] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [linked, setLinked] = useState<AthleteMatch | null>(null)
  const [alreadySigned, setAlreadySigned] = useState(false)
  const [bulk, setBulk] = useState('')
  const [inviter, setInviter] = useState(defaultInviter)
  const [personalLine, setPersonalLine] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rows: NewInviteInput[] = (
    mode === 'single'
      ? name.trim() ? [{ name: name.trim(), phone: phone.trim() || undefined, profile_url: profileUrl.trim() || undefined, club: club.trim() || undefined }] : []
      : parseInviteLines(bulk)
  ).map((r) => ({
    ...r,
    invited_by: inviter.trim(),
    personal_line: personalLine.trim() || undefined,
    ...(mode === 'single' && linked ? { ausa_athlete_id: linked.id } : {}),
    category: (mode === 'single' && linked?.signed) || alreadySigned ? ('signed' as const) : ('new' as const),
  }))
  const badLinks = rows.filter((r) => r.profile_url && !isProfileUrl(r.profile_url)).map((r) => r.name)
  const canSubmit = !disabled && !isSubmitting && rows.length > 0 && inviter.trim().length > 0 && badLinks.length === 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      await onCreate(rows)
      setName('')
      setPhone('')
      setClub('')
      setProfileUrl('')
      setLinked(null)
      setAlreadySigned(false)
      setBulk('')
      setPersonalLine('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Add invites</h2>
        <InviteModeToggle mode={mode} onMode={setMode} />
      </div>

      {mode === 'single' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <AthleteLookup
            name={name}
            onName={setName}
            linked={linked}
            onLink={(m) => {
              setLinked(m)
              if (m?.phone && !phone.trim()) setPhone(m.phone)
            }}
            disabled={disabled}
          />
          <div className="space-y-1.5">
            <Label htmlFor="inv-phone">Phone (WhatsApp)</Label>
            <Input id="inv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0151 2345678" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-profile">Profil-Link (FuPa oder Transfermarkt)</Label>
            <Input id="inv-profile" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://www.fupa.net/player/..." disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-club">Verein (optional, hilft der FuPa-Suche)</Label>
            <Input id="inv-club" value={club} onChange={(e) => setClub(e.target.value)} placeholder="SV Beispielhausen" disabled={disabled || !!linked} />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="inv-bulk">One player per line: name, phone, profile link (phone and link optional)</Label>
          <Textarea
            id="inv-bulk"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={'Vorname Nachname, 0151 2345678, https://www.fupa.net/player/...\nVorname Nachname'}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? 'player' : 'players'} recognised</p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={alreadySigned || !!linked?.signed} disabled={disabled || !!linked?.signed} onChange={(e) => setAlreadySigned(e.target.checked)} className="h-4 w-4 accent-primary" />
        Bereits bei Athletes USA
        <span className="text-xs text-muted-foreground">(sets the Signed badge when the lookup finds nothing; applies to every pasted line)</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inv-by">Invited by *</Label>
          <Input id="inv-by" value={inviter} onChange={(e) => setInviter(e.target.value)} placeholder="Your first name" disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-line">Personal line (optional, goes into the WhatsApp text)</Label>
          <Input
            id="inv-line"
            value={personalLine}
            onChange={(e) => setPersonalLine(e.target.value)}
            placeholder="Nach deinem Spiel am Sonntag muss ich dich einfach dabei haben."
            disabled={disabled}
          />
        </div>
      </div>

      {badLinks.length > 0 && <p className="text-sm text-destructive">{PROFILE_URL_ERROR} ({badLinks.join(', ')})</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {rows.length > 1 ? `Create ${rows.length} invites` : 'Create invite'}
        </Button>
      </div>
    </form>
  )
}
