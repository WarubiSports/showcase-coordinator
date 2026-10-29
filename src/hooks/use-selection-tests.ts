'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SelectionTestPlayer, TestField } from '@/lib/selection-tests'

const call = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || body.error || `Anfrage fehlgeschlagen (${res.status})`)
  return body as T
}

// The Kader of one event with its test values; each save writes one field of one player and takes back the row
export const useSelectionTests = (eventId: string | undefined) => {
  const [players, setPlayers] = useState<SelectionTestPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [migrationPending, setMigrationPending] = useState(false)

  const fetchRoster = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!eventId) { setPlayers([]); return }
      const body = await call<{ players: SelectionTestPlayer[]; migrationPending: boolean }>(
        `/api/admin/invites/tests?event_id=${encodeURIComponent(eventId)}`,
      )
      setPlayers(body.players)
      setMigrationPending(body.migrationPending)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kader konnte nicht geladen werden')
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  const saveScore = async (playerId: string, field: TestField, value: number | null) => {
    if (!eventId) throw new Error('Kein Event ausgewählt')
    const updated = await call<SelectionTestPlayer>('/api/admin/invites/tests', {
      method: 'PATCH',
      body: JSON.stringify({ eventId, playerId, values: { [field]: value } }),
    })
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? updated : p)))
  }

  return { players, isLoading, error, migrationPending, refetch: fetchRoster, saveScore }
}
