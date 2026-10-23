'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviterFieldProps {
  value: string
  onChange: (value: string) => void
  staffName: string | null
  disabled?: boolean
}

// Who signs the WhatsApp text. With a Staff App login it is the staff member's first name, shown as text with
// a "change" link; under the shared admin password it is an input.
export const InviterField = ({ value, onChange, staffName, disabled }: InviterFieldProps) => {
  const [editing, setEditing] = useState(false)
  if (staffName && !editing) {
    return (
      <p className="text-sm">
        Eingeladen von <span className="font-medium">{value || staffName}</span>{' '}
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted-foreground underline">ändern</button>
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="inv-by">Eingeladen von *</Label>
      <Input id="inv-by" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Dein Vorname" disabled={disabled} />
    </div>
  )
}
