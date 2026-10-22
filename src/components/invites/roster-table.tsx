'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InvitePlayer, InviteWithPlayer } from '@/types'

// Accepted players, shirt numbers first (lowest to highest), then the ones without a number by name
export const rosterRows = (invites: InviteWithPlayer[]): InvitePlayer[] =>
  invites
    .filter((i) => i.status === 'accepted' && i.player)
    .map((i) => i.player as InvitePlayer)
    .sort((a, b) => {
      if (a.jersey_number != null && b.jersey_number != null) return a.jersey_number - b.jersey_number
      if (a.jersey_number != null) return -1
      if (b.jersey_number != null) return 1
      return a.name.localeCompare(b.name)
    })

const JerseyInput = ({ value, taken, onSave }: { value: number | null; taken: boolean; onSave: (n: number | null) => void }) => {
  const [text, setText] = useState(value?.toString() ?? '')
  const save = () => {
    const n = text.trim() ? parseInt(text, 10) : null
    if (text.trim() && (n === null || Number.isNaN(n) || n < 0 || n > 99)) { setText(value?.toString() ?? ''); return }
    if (n !== value) onSave(n)
  }
  return (
    <Input
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`h-9 w-16 text-center font-semibold ${taken ? 'border-destructive text-destructive' : ''}`}
      aria-label="Shirt number"
    />
  )
}

interface RosterTableProps {
  invites: InviteWithPlayer[]
  onJersey: (playerId: string, n: number | null) => void
}

export const RosterTable = ({ invites, onJersey }: RosterTableProps) => {
  const rows = rosterRows(invites)
  const counts = rows.reduce<Record<number, number>>((acc, p) => {
    if (p.jersey_number != null) acc[p.jersey_number] = (acc[p.jersey_number] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{rows.length} accepted {rows.length === 1 ? 'player' : 'players'}</h2>
        <Button variant="outline" size="sm" asChild>
          <a href="/invites/roster" target="_blank" rel="noopener noreferrer"><Printer className="h-4 w-4" />Print roster</a>
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No accepted players yet.</div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <JerseyInput value={p.jersey_number} taken={p.jersey_number != null && counts[p.jersey_number] > 1} onSave={(n) => onJersey(p.id, n)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[p.position, p.birth_year, p.club].filter(Boolean).join(' · ') || 'no details'}
                  {p.consent_profile_at ? '' : ' · no clip consent'}
                </p>
              </div>
              <span className="w-12 text-right text-sm font-semibold">{p.position ?? ''}</span>
            </li>
          ))}
        </ul>
      )}
      {Object.values(counts).some((n) => n > 1) && <p className="text-sm text-destructive">Two players share a number.</p>}
    </div>
  )
}
