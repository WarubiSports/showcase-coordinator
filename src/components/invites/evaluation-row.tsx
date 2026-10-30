'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EvaluationPanel } from '@/components/invites/evaluation-panel'
import { PlayerName } from '@/components/invites/station-rows'
import type { SelectionTestPlayer } from '@/lib/selection-tests'
import type { EvaluationEntry, EvaluationInput } from '@/lib/selection-evaluation'

interface EvaluationRowProps {
  player: SelectionTestPlayer
  scout: string | null
  entries: EvaluationEntry[]
  open: boolean
  onToggle: () => void
  onSave: (playerId: string, note: EvaluationInput, expectedVersion: number) => Promise<void>
  // Tells the page which players hold an unsaved evaluation, so the bar can warn from every station
  onUnsavedChange: (playerId: string, unsaved: boolean) => void
}

// Bewertung station: one line per player with its state; tapping opens the evaluation below it. The panel stays
// mounted while closed, so a typed but unsaved evaluation is kept, and the line then says "Nicht gespeichert".
export const EvaluationRow = ({ player, scout, entries, open, onToggle, onSave, onUnsavedChange }: EvaluationRowProps) => {
  const [dirty, setDirtyState] = useState(false)
  const setDirty = useCallback((d: boolean) => {
    setDirtyState(d)
    onUnsavedChange(player.id, d)
  }, [player.id, onUnsavedChange])
  useEffect(() => () => onUnsavedChange(player.id, false), [player.id, onUnsavedChange])
  const ref = useRef<HTMLDivElement>(null)
  const own = !!scout && entries.some((e) => e.scout === scout)
  const others = entries.filter((e) => e.scout !== scout).length

  const toggle = () => {
    onToggle()
    // The row closing above shifts this one; bring its start back under the sticky bar
    if (!open) requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start' }))
  }

  return (
    <div ref={ref} className="scroll-mt-60 rounded-lg border bg-card">
      <button type="button" aria-expanded={open} onClick={toggle} className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left">
        <PlayerName player={player} />
        <span className="ml-auto shrink-0 text-xs">
          {dirty ? (
            <span className="font-medium text-amber-700">Nicht gespeichert</span>
          ) : own ? (
            <span className="font-medium text-green-700">✓ Bewertet</span>
          ) : (
            <span className="text-muted-foreground">Offen</span>
          )}
          {others > 0 && <span className="text-muted-foreground"> · +{others}</span>}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      <div hidden={!open} className="border-t px-3 py-3">
        <EvaluationPanel playerId={player.id} scout={scout} entries={entries} onSave={onSave} onDirtyChange={setDirty} />
      </div>
    </div>
  )
}
