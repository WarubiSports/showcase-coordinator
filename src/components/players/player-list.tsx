'use client'

import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Player } from '@/types'

interface PlayerListProps {
  players: Player[]
  isLoading: boolean
  onEdit: (player: Player) => void
  onDelete: (id: string) => void
  onUpdateScores: (id: string, scores: Partial<Player>) => void
}

function getBest(val1: number | null, val2: number | null, lowerIsBetter = false): number | null {
  if (val1 === null && val2 === null) return null
  if (val1 === null) return val2
  if (val2 === null) return val1
  return lowerIsBetter ? Math.min(val1, val2) : Math.max(val1, val2)
}

function PlayerCard({
  player,
  onEdit,
  onDelete,
  onUpdateScores
}: {
  player: Player
  onEdit: () => void
  onDelete: () => void
  onUpdateScores: (scores: Partial<Player>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [scores, setScores] = useState({
    broad_jump_1: player.broad_jump_1?.toString() || '',
    broad_jump_2: player.broad_jump_2?.toString() || '',
    sprint_1: player.sprint_1?.toString() || '',
    sprint_2: player.sprint_2?.toString() || '',
    high_jump_1: player.high_jump_1?.toString() || '',
    high_jump_2: player.high_jump_2?.toString() || '',
  })

  const bestBroadJump = getBest(player.broad_jump_1, player.broad_jump_2)
  const bestSprint = getBest(player.sprint_1, player.sprint_2, true)
  const bestHighJump = getBest(player.high_jump_1, player.high_jump_2)

  const handleScoreChange = (field: string, value: string) => {
    setScores((prev) => ({ ...prev, [field]: value }))
  }

  const handleScoreBlur = (field: string) => {
    const value = scores[field as keyof typeof scores]
    const numValue = value ? parseFloat(value) : null
    const currentValue = player[field as keyof Player]

    if (numValue !== currentValue) {
      onUpdateScores({ [field]: numValue })
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{player.name}</h3>
              {player.position && (
                <Badge variant="outline">{player.position}</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {player.birth_year && <span>{player.birth_year}</span>}
              {player.club && <span>{player.club}</span>}
              {player.country && <span>{player.country}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Test scores summary */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">Broad Jump</div>
            <div className="font-semibold">
              {bestBroadJump !== null ? `${bestBroadJump} cm` : '—'}
            </div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">Sprint</div>
            <div className="font-semibold">
              {bestSprint !== null ? `${bestSprint} s` : '—'}
            </div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">High Jump</div>
            <div className="font-semibold">
              {bestHighJump !== null ? `${bestHighJump} cm` : '—'}
            </div>
          </div>
        </div>

        {/* Expand/collapse for score entry */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" /> Hide Scores
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" /> Enter Scores
            </>
          )}
        </Button>

        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {/* Broad Jump */}
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Broad Jump (cm)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Try 1"
                    value={scores.broad_jump_1}
                    onChange={(e) => handleScoreChange('broad_jump_1', e.target.value)}
                    onBlur={() => handleScoreBlur('broad_jump_1')}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Try 2"
                    value={scores.broad_jump_2}
                    onChange={(e) => handleScoreChange('broad_jump_2', e.target.value)}
                    onBlur={() => handleScoreBlur('broad_jump_2')}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Sprint */}
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Sprint (seconds)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Try 1"
                    value={scores.sprint_1}
                    onChange={(e) => handleScoreChange('sprint_1', e.target.value)}
                    onBlur={() => handleScoreBlur('sprint_1')}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Try 2"
                    value={scores.sprint_2}
                    onChange={(e) => handleScoreChange('sprint_2', e.target.value)}
                    onBlur={() => handleScoreBlur('sprint_2')}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* High Jump */}
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">High Jump (cm)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Try 1"
                    value={scores.high_jump_1}
                    onChange={(e) => handleScoreChange('high_jump_1', e.target.value)}
                    onBlur={() => handleScoreBlur('high_jump_1')}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Try 2"
                    value={scores.high_jump_2}
                    onChange={(e) => handleScoreChange('high_jump_2', e.target.value)}
                    onBlur={() => handleScoreBlur('high_jump_2')}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PlayerList({ players, isLoading, onEdit, onDelete, onUpdateScores }: PlayerListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No players yet. Add your first player to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          onEdit={() => onEdit(player)}
          onDelete={() => onDelete(player.id)}
          onUpdateScores={(scores) => onUpdateScores(player.id, scores)}
        />
      ))}
    </div>
  )
}
