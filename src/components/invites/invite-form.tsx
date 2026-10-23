'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { NewInviteInput } from '@/hooks/use-invites'

interface InviteFormProps {
  defaultInviter: string
  disabled?: boolean
  onCreate: (rows: NewInviteInput[]) => Promise<void>
}

// "Max Mustermann, 0151 2345678" per line; phone is optional
const parseLines = (text: string): { name: string; phone?: string }[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, phone] = line.split(/\s*[,;\t]\s*/)
      return { name: name.trim(), phone: phone?.trim() || undefined }
    })
    .filter((r) => r.name)

export const InviteForm = ({ defaultInviter, disabled, onCreate }: InviteFormProps) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bulk, setBulk] = useState('')
  const [inviter, setInviter] = useState(defaultInviter)
  const [personalLine, setPersonalLine] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rows: NewInviteInput[] = (mode === 'single' ? (name.trim() ? [{ name: name.trim(), phone: phone.trim() || undefined }] : []) : parseLines(bulk)).map(
    (r) => ({ ...r, invited_by: inviter.trim(), personal_line: personalLine.trim() || undefined }),
  )
  const canSubmit = !disabled && !isSubmitting && rows.length > 0 && inviter.trim().length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      await onCreate(rows)
      setName('')
      setPhone('')
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
        <div className="flex rounded-md border p-0.5 text-sm">
          {(['single', 'bulk'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {m === 'single' ? 'One player' : 'Paste several'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'single' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Player name *</Label>
            <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname Nachname" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-phone">Phone (WhatsApp)</Label>
            <Input id="inv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0151 2345678" disabled={disabled} />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="inv-bulk">One player per line: name, phone</Label>
          <Textarea
            id="inv-bulk"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={'Vorname Nachname, 0151 2345678\nVorname Nachname'}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? 'player' : 'players'} recognised</p>
        </div>
      )}

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

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {rows.length > 1 ? `Create ${rows.length} invites` : 'Create invite'}
        </Button>
      </div>
    </form>
  )
}
