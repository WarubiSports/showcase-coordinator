'use client'

import { ScoreInput } from '@/components/invites/score-input'
import type { SaveOutcome } from '@/lib/score-sync'
import { SPRINT_SPLITS, TESTS, bestOf, formatScore, type SelectionTestPlayer, type TestField, type TestKey } from '@/lib/selection-tests'

interface SelectionTestCardProps {
  player: SelectionTestPlayer
  disabled: boolean
  onSave: (playerId: string, field: TestField, value: number | null, onScreen: number | null) => Promise<SaveOutcome>
}

const best = (player: SelectionTestPlayer, key: TestKey) => {
  const v = bestOf(player, key)
  return v === null ? '-' : formatScore(v)
}

const ATTEMPTS = [1, 2] as const

// One player's tests (the card's "Tests" view): sprint splits per attempt in two rows, agility and broad jump with
// both attempts side by side, and the best value of each (lowest time, longest jump)
export const SelectionTestCard = ({ player, disabled, onSave }: SelectionTestCardProps) => {
  const input = (field: TestField, placeholder: string) => (
    <ScoreInput
      field={field}
      value={player[field]}
      placeholder={placeholder}
      disabled={disabled}
      onSave={(value) => onSave(player.id, field, value, player[field])}
    />
  )

  const pair = (key: 'agility' | 'broad_jump', unit: string) => (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">{TESTS[key].label} <span className="font-normal text-muted-foreground">· {unit}</span></h3>
      <div className="grid grid-cols-3 gap-1.5 text-center text-xs text-muted-foreground">
        <span>Versuch 1</span>
        <span>Versuch 2</span>
        <span>Bestwert</span>
      </div>
      <div className="grid grid-cols-3 items-center gap-1.5">
        {input(`${key}_1`, TESTS[key].unit)}
        {input(`${key}_2`, TESTS[key].unit)}
        <span className="text-center text-base font-bold tabular-nums">{best(player, key)}</span>
      </div>
    </section>
  )

  return (
    <div className="space-y-4">
      <section className="space-y-1">
        <h3 className="text-sm font-semibold">Sprint <span className="font-normal text-muted-foreground">(Sekunden)</span></h3>
        <div className="grid grid-cols-5 gap-1.5 text-center text-xs font-medium text-muted-foreground">
          {SPRINT_SPLITS.map((s) => <span key={s.key}>{s.label}</span>)}
        </div>
        {ATTEMPTS.map((n) => (
          <div key={n} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Versuch {n}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {SPRINT_SPLITS.map((s) => <div key={s.key}>{input(`${s.key}_${n}`, s.label)}</div>)}
            </div>
          </div>
        ))}
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Bestwert</p>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {SPRINT_SPLITS.map((s) => (
              <span key={s.key} className="min-w-0 truncate text-base font-bold tabular-nums">{best(player, s.key)}</span>
            ))}
          </div>
        </div>
      </section>

      {pair('agility', 'Sekunden')}
      {pair('broad_jump', 'cm')}
    </div>
  )
}
