'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LookupChip } from '@/components/invites/lookup-chip'
import type { LookupResult } from '@/lib/lookup-resolve'
import type { InviteLine } from '@/lib/invite-lines'

interface InviteBulkProps {
  text: string
  onText: (value: string) => void
  rows: InviteLine[]
  onResolve: (index: number, result: LookupResult) => void
  disabled?: boolean
}

// "Add several at once": a textarea, then one row per line with the same lookup line as the single form
export const InviteBulk = ({ text, onText, rows, onResolve, disabled }: InviteBulkProps) => (
  <div className="space-y-3">
    <div className="space-y-1.5">
      <Label htmlFor="inv-bulk">Ein Spieler pro Zeile, Handynummer optional nach dem Komma</Label>
      <Textarea id="inv-bulk" value={text} onChange={(e) => onText(e.target.value)} rows={4} placeholder={'Timo Testspieler, 0151 2345678\nJonas Probekick'} disabled={disabled} />
    </div>
    {rows.length > 0 && (
      <ul className="divide-y rounded-md border">
        {rows.map((r, i) => (
          <li key={`${i}-${r.name}`} className="space-y-1 px-3 py-2">
            <p className="text-sm font-medium">{r.name}{r.phone ? <span className="font-normal text-muted-foreground"> · {r.phone}</span> : null}</p>
            <LookupChip name={r.name} onResolve={(result) => onResolve(i, result)} />
          </li>
        ))}
      </ul>
    )}
  </div>
)
