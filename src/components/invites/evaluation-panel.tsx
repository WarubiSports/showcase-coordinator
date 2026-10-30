'use client'

import { EvaluationForm } from '@/components/invites/evaluation-form'
import { EvaluationList } from '@/components/invites/evaluation-list'
import type { EvaluationEntry, EvaluationInput } from '@/lib/selection-evaluation'

interface EvaluationPanelProps {
  playerId: string
  scout: string | null
  entries: EvaluationEntry[]
  onSave: (playerId: string, note: EvaluationInput, expectedVersion: number) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

// One player's evaluations: the own one to edit (Staff App login), the colleagues' ones to read
export const EvaluationPanel = ({ playerId, scout, entries, onSave, onDirtyChange }: EvaluationPanelProps) => {
  const own = scout ? entries.find((e) => e.scout === scout) : undefined
  const others = entries.filter((e) => e !== own)
  return (
    <div className="space-y-4">
      {scout ? (
        <EvaluationForm scout={scout} own={own} onSave={(note, version) => onSave(playerId, note, version)} onDirtyChange={onDirtyChange} />
      ) : (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Eigene Bewertungen gehen nur mit dem Staff-App-Login. Hier nur lesen.
        </p>
      )}
      {others.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Bewertungen von Kollegen ({others.length})</h3>
          <EvaluationList entries={others} />
        </div>
      )}
      {!scout && others.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Bewertungen.</p>}
    </div>
  )
}
