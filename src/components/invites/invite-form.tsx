'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NewInviteInput } from '@/hooks/use-invites'
import { parseInviteLines } from '@/lib/invite-lines'
import { PROFILE_LINK_HINT, isProfileUrl } from '@/lib/profile-url'
import type { LookupResult } from '@/lib/lookup-resolve'
import { LookupChip } from '@/components/invites/lookup-chip'
import { InviterField } from '@/components/invites/inviter-field'
import { InviteBulk } from '@/components/invites/invite-bulk'

interface InviteFormProps {
  defaultInviter: string
  staffName: string | null
  disabled?: boolean
  onCreate: (rows: NewInviteInput[]) => Promise<void>
}

const NONE: LookupResult = { category: 'new' }

// Add invites: one player by default (name, phone), the lookup line says what Base or FuPa knows, the link
// and category come from that. "Add several at once" takes one name per line with the same lookup per row.
export const InviteForm = ({ defaultInviter, staffName, disabled, onCreate }: InviteFormProps) => {
  const [bulk, setBulk] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [link, setLink] = useState('')
  const [single, setSingle] = useState<LookupResult>(NONE)
  const [text, setText] = useState('')
  const [resolved, setResolved] = useState<Record<number, LookupResult>>({})
  const [inviter, setInviter] = useState(defaultInviter)
  const [personalLine, setPersonalLine] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const lines = bulk ? parseInviteLines(text) : []
  const common = { invited_by: inviter.trim(), personal_line: personalLine.trim() || undefined }
  const rows: NewInviteInput[] = bulk
    ? lines.map((l, i) => ({ name: l.name, phone: l.phone, ...common, ...(resolved[i] ?? NONE) }))
    : name.trim()
      ? [{ name: name.trim(), phone: phone.trim() || undefined, ...common, ...single, ...(link.trim() && !single.profile_url ? { profile_url: link.trim() } : {}) }]
      : []
  const badLink = !bulk && link.trim() !== '' && !isProfileUrl(link)
  const canSubmit = !disabled && !isSubmitting && rows.length > 0 && inviter.trim().length > 0 && !badLink

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      await onCreate(rows)
      setName('')
      setPhone('')
      setLink('')
      setText('')
      setResolved({})
      setPersonalLine('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Add invites</h2>
        <button type="button" onClick={() => setBulk(!bulk)} className="text-sm text-muted-foreground underline">{bulk ? 'One player' : 'Add several at once'}</button>
      </div>

      {bulk ? (
        <InviteBulk text={text} onText={setText} rows={lines} onResolve={(i, r) => setResolved((prev) => ({ ...prev, [i]: r }))} disabled={disabled} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Player name *</Label>
              <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" autoComplete="off" disabled={disabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-phone">Phone (optional)</Label>
              <Input id="inv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0151 2345678" disabled={disabled} />
            </div>
          </div>
          <LookupChip name={name} onResolve={(r) => setSingle(r)} />
          {single.category === 'new' && !single.profile_url && !single.ausa_athlete_id && name.trim().length >= 3 && (
            <div className="space-y-1.5">
              <Label htmlFor="inv-link">Profile link (FuPa or Transfermarkt, optional)</Label>
              <Input id="inv-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.fupa.net/player/..." disabled={disabled} />
              {badLink && <p className="text-xs text-destructive">{PROFILE_LINK_HINT}</p>}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <InviterField value={inviter} onChange={setInviter} staffName={staffName} disabled={disabled} />
        <div className="space-y-1.5">
          <Label htmlFor="inv-line">Personal line (optional)</Label>
          <Input id="inv-line" value={personalLine} onChange={(e) => setPersonalLine(e.target.value)} placeholder="Goes into the WhatsApp text" disabled={disabled} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {rows.length > 1 ? `Create ${rows.length} invites` : 'Create invite'}
        </Button>
      </div>
    </form>
  )
}
