'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Player, PlayerPosition } from '@/types'

interface PlayerFilters {
  position?: PlayerPosition
  search?: string
}

export function usePlayers(filters?: PlayerFilters) {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('showcase_players')
        .select('*')
        .order('name')

      if (filters?.position) {
        query = query.eq('position', filters.position)
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setPlayers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players')
    } finally {
      setIsLoading(false)
    }
  }, [filters?.position, filters?.search])

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
    const { data, error } = await supabase
      .from('showcase_players')
      .insert([player])
      .select()
      .single()

    if (error) throw error

    setPlayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  const updatePlayer = async (
    id: string,
    updates: Partial<Omit<Player, 'id' | 'created_at'>>
  ) => {
    const { data, error } = await supabase
      .from('showcase_players')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

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
    const { error } = await supabase.from('showcase_players').delete().eq('id', id)
    if (error) throw error
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
