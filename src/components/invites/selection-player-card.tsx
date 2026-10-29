'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SelectionTestCard } from '@/components/invites/selection-test-card'
import { EvaluationPanel } from '@/components/invites/evaluation-panel'
import type { SelectionTestPlayer, TestField } from '@/lib/selection-tests'
import type { EvaluationEntry, EvaluationInput } from '@/lib/selection-evaluation'

type View = 'tests' | 'evaluation'

interface SelectionPlayerCardProps {
  player: SelectionTestPlayer
  testsDisabled: boolean
  onSaveScore: (playerId: string, field: TestField, value: number | null) => Promise<void>
  scout: string | null
  evaluations: EvaluationEntry[]
  onSaveEvaluation: (playerId: string, note: EvaluationInput, expectedVersion: number) => Promise<void>
}

// One player: "#Nr Name · Position", then Tests or Bewertung. Both views stay mounted, so switching never loses
// what is typed but not yet saved.
export const SelectionPlayerCard = ({ player, testsDisabled, onSaveScore, scout, evaluations, onSaveEvaluation }: SelectionPlayerCardProps) => {
  const [view, setView] = useState<View>('tests')
  const ownSaved = !!scout && evaluations.some((e) => e.scout === scout)
  const tab = (value: View, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === value}
      onClick={() => setView(value)}
      className={cn('min-h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors', view === value ? 'bg-background shadow-sm' : 'text-muted-foreground')}
    >
      {label}
    </button>
  )

  return (
    <li className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
      <h2 className="text-base font-semibold leading-tight">
        <span className="tabular-nums">#{player.jersey_number ?? '?'}</span> {player.name}
        {player.position && <span className="font-normal text-muted-foreground"> · {player.position}</span>}
      </h2>
      <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1">
        {tab('tests', 'Tests')}
        {tab('evaluation', `Bewertung${evaluations.length ? ` · ${evaluations.length}` : ''}${ownSaved ? ' ✓' : ''}`)}
      </div>
      <div hidden={view !== 'tests'}>
        <SelectionTestCard player={player} disabled={testsDisabled} onSave={onSaveScore} />
      </div>
      <div hidden={view !== 'evaluation'}>
        <EvaluationPanel playerId={player.id} scout={scout} entries={evaluations} onSave={onSaveEvaluation} />
      </div>
    </li>
  )
}
