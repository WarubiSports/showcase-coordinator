'use client'

import { ScoreInput } from '@/components/invites/score-input'
import type { SaveOutcome } from '@/lib/score-sync'
import { SPRINT_SPLITS, TESTS, bestOf, bestTopSpeed, formatScore, type SelectionTestPlayer, type TestField } from '@/lib/selection-tests'
import { hasStationValue } from '@/lib/test-stations'

type OnSave = (playerId: string, field: TestField, value: number | null, onScreen: number | null) => Promise<SaveOutcome>

interface RowProps {
  player: SelectionTestPlayer
  disabled: boolean
  onSave: OnSave
}

// The column grids, shared with the column header in the sticky bar so the labels sit over the fields
export const SPRINT_GRID = 'grid grid-cols-[1.75rem_repeat(4,minmax(0,1fr))] gap-1.5'
export const PAIR_GRID = 'grid grid-cols-[minmax(0,1fr)_4.25rem_4.25rem_3.25rem] gap-1.5'

const ATTEMPTS = [1, 2] as const
const shown = (v: number | null) => (v === null ? '-' : formatScore(v))

const field = ({ player, disabled, onSave }: RowProps, name: TestField, placeholder: string) => (
  <ScoreInput
    field={name}
    value={player[name]}
    placeholder={placeholder}
    disabled={disabled}
    onSave={(value) => onSave(player.id, name, value, player[name])}
  />
)

// One line, or (stacked, beside the narrow agility and jump fields) the name wrapping with the position below it
export const PlayerName = ({ player, stacked = false }: { player: SelectionTestPlayer; stacked?: boolean }) =>
  stacked ? (
    <div className="min-w-0 leading-tight">
      <p className="break-words text-sm font-semibold"><span className="tabular-nums">#{player.jersey_number ?? '?'}</span> {player.name}</p>
      {player.position && <p className="truncate text-xs text-muted-foreground">{player.position}</p>}
    </div>
  ) : (
    <p className="min-w-0 truncate text-sm font-semibold leading-tight">
      <span className="tabular-nums">#{player.jersey_number ?? '?'}</span> {player.name}
      {player.position && <span className="font-normal text-muted-foreground"> · {player.position}</span>}
    </p>
  )

// Sprint station: the four splits of each attempt in one line, the top speed from 20 to 30 m beside the name, the
// best split of each column once a value is in
export const SprintRow = (props: RowProps) => {
  const { player } = props
  const top = bestTopSpeed(player)
  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-2">
      <div className="flex items-baseline justify-between gap-2">
        <PlayerName player={player} />
        {top !== null && (
          <span className="shrink-0 text-xs text-muted-foreground">
            Top <span className="font-semibold text-foreground tabular-nums">{formatScore(top)}</span> km/h
          </span>
        )}
      </div>
      {ATTEMPTS.map((n) => (
        <div key={n} className={`${SPRINT_GRID} items-center`}>
          <span className="text-xs text-muted-foreground">V{n}</span>
          {SPRINT_SPLITS.map((s) => <div key={s.key}>{field(props, `${s.key}_${n}`, s.label)}</div>)}
        </div>
      ))}
      {hasStationValue(player, 'sprint') && (
        <div className={`${SPRINT_GRID} text-center text-xs tabular-nums`}>
          <span className="text-left text-muted-foreground">Best</span>
          {SPRINT_SPLITS.map((s) => <span key={s.key} className="truncate font-semibold">{shown(bestOf(player, s.key))}</span>)}
        </div>
      )}
    </div>
  )
}

// Agility or broad jump station: name, both attempts and the best value in one line
export const PairRow = ({ test, ...props }: RowProps & { test: 'agility' | 'broad_jump' }) => (
  <div className={`${PAIR_GRID} items-center rounded-lg border bg-card p-2`}>
    <PlayerName player={props.player} stacked />
    {field(props, `${test}_1`, TESTS[test].unit)}
    {field(props, `${test}_2`, TESTS[test].unit)}
    <span className="text-center text-base font-bold tabular-nums">{shown(bestOf(props.player, test))}</span>
  </div>
)
