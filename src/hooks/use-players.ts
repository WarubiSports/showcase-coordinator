'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Player, PlayerPosition } from '@/types'

const adminFetch = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body as T
}

interface PlayerFilters {
  position?: PlayerPosition
  search?: string
}

export function usePlayers(eventId: string | undefined, filters?: PlayerFilters) {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!eventId) { setPlayers([]); setIsLoading(false); return }

      // showcase_players holds minors' contact data: reads go through the admin API (service role)
      const params = new URLSearchParams({ event_id: eventId })
      if (filters?.position) params.set('position', filters.position)
      if (filters?.search) params.set('search', filters.search)
      const data = await adminFetch<Player[]>(`/api/admin/players?${params}`)

      setPlayers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players')
    } finally {
      setIsLoading(false)
    }
  }, [eventId, filters?.position, filters?.search])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const createPlayer = async (player: {
    name: string
    position?: PlayerPosition
    birth_year?: number
    club?: string
    country?: string
    email?: string
    phone?: string
    notes?: string
    created_by: string
  }) => {
    if (!eventId) throw new Error('No event selected')
    const data = await adminFetch<Player>('/api/admin/players', {
      method: 'POST',
      body: JSON.stringify({ eventId, player }),
    })

    setPlayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  const updatePlayer = async (
    id: string,
    updates: Partial<Omit<Player, 'id' | 'created_at'>>
  ) => {
    const data = await adminFetch<Player>(`/api/admin/players/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })

    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? data : p))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    return data
  }

  const updateTestScores = async (
    id: string,
    scores: {
      broad_jump_1?: number | null
      broad_jump_2?: number | null
      sprint_1?: number | null
      sprint_2?: number | null
      high_jump_1?: number | null
      high_jump_2?: number | null
    }
  ) => {
    return updatePlayer(id, scores)
  }

  const deletePlayer = async (id: string) => {
    await adminFetch(`/api/admin/players/${id}`, { method: 'DELETE' })
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  return {
    players,
    isLoading,
    error,
    refetch: fetchPlayers,
    createPlayer,
    updatePlayer,
    updateTestScores,
    deletePlayer,
  }
}
