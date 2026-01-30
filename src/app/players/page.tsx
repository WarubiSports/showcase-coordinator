'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlayerList } from '@/components/players/player-list'
import { PlayerForm } from '@/components/players/player-form'
import { usePlayers } from '@/hooks/use-players'
import { useUser } from '@/hooks/use-user'
import type { Player, PlayerPosition } from '@/types'

const POSITIONS: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

export default function PlayersPage() {
  const { userName } = useUser()
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | undefined>()
  const [searchFilter, setSearchFilter] = useState('')

  const { players, isLoading, createPlayer, updatePlayer, deletePlayer } = usePlayers({
    position: positionFilter,
    search: searchFilter,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  const handleCreate = async (data: {
    name: string
    position?: PlayerPosition
    birth_year?: number
    club?: string
    country?: string
    email?: string
    phone?: string
    notes?: string
  }) => {
    try {
      await createPlayer({
        ...data,
        created_by: userName || 'Unknown',
      })
      toast.success('Player added successfully')
    } catch {
      toast.error('Failed to add player')
      throw new Error('Failed to add player')
    }
  }

  const handleUpdate = async (data: {
    name: string
    position?: PlayerPosition
    birth_year?: number
    club?: string
    country?: string
    email?: string
    phone?: string
    notes?: string
  }) => {
    if (!editingPlayer) return
    try {
      await updatePlayer(editingPlayer.id, data)
      toast.success('Player updated successfully')
      setEditingPlayer(null)
    } catch {
      toast.error('Failed to update player')
      throw new Error('Failed to update player')
    }
  }

  const handleUpdateScores = async (id: string, scores: Partial<Player>) => {
    try {
      await updatePlayer(id, scores)
      toast.success('Scores updated')
    } catch {
      toast.error('Failed to update scores')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this player?')) return
    try {
      await deletePlayer(id)
      toast.success('Player removed')
    } catch {
      toast.error('Failed to remove player')
    }
  }

  const handleEdit = (player: Player) => {
    setEditingPlayer(player)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingPlayer(null)
  }

  // Count players with scores
  const playersWithScores = players.filter(
    (p) => p.broad_jump_1 || p.sprint_1 || p.high_jump_1
  ).length

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Players</h1>
            <p className="text-muted-foreground">
              Manage showcase players and their test scores
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-primary">{players.length}</div>
            <div className="text-xs text-muted-foreground">Total Players</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{playersWithScores}</div>
            <div className="text-xs text-muted-foreground">With Scores</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">
              {players.length - playersWithScores}
            </div>
            <div className="text-xs text-muted-foreground">Pending Tests</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {players.filter((p) => p.position === 'GK').length}
            </div>
            <div className="text-xs text-muted-foreground">Goalkeepers</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={positionFilter || 'all'}
            onValueChange={(val) => setPositionFilter(val === 'all' ? undefined : val as PlayerPosition)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PlayerList
          players={players}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateScores={handleUpdateScores}
        />

        <PlayerForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingPlayer ? handleUpdate : handleCreate}
          player={editingPlayer}
        />
      </div>
    </AppShell>
  )
}
