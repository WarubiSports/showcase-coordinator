'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SelectionTestPlayer, TestField } from '@/lib/selection-tests'
import { createScoreSync, type SaveOutcome } from '@/lib/score-sync'

// Someone else saved this field in between; carries the value stored now
export class ScoreConflictError extends Error {
  current: number | null
  constructor(current: number | null) {
    super('value_conflict')
    this.name = 'ScoreConflictError'
    this.current = current
  }
}

const call = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || body.error || `Anfrage fehlgeschlagen (${res.status})`)
  return body as T
}

// The Kader of one event with its test values; each save writes one field of one player
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

  const [sync] = useState(createScoreSync)

  // Saves one field. Only that field is taken from the answer, and only from the answer to the latest save of the
  // field ('stale' otherwise). A conflict (someone else changed it) puts the stored value on screen and throws it.
  const saveScore = async (playerId: string, field: TestField, value: number | null, onScreen: number | null): Promise<SaveOutcome> => {
    if (!eventId) throw new Error('Kein Event ausgewählt')
    const key = `${playerId}:${field}`
    const { seq, expected } = sync.start(key, value, onScreen)
    const setField = (v: number | null) => setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, [field]: v } : p)))
    let res: Response
    let body: Record<string, unknown>
    try {
      res = await fetch('/api/admin/invites/tests', {
        method: 'PATCH',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, playerId, values: { [field]: value }, expected: { [field]: expected } }),
      })
      body = await res.json().catch(() => ({}))
    } catch (err) {
      if (!sync.finish(key, seq)) return 'stale'
      throw err
    }
    if (!sync.finish(key, seq)) return 'stale'
    if (res.status === 409 && body.current) {
      const current = (body.current as SelectionTestPlayer)[field]
      setField(current)
      if (current === value) return 'applied'
      throw new ScoreConflictError(current)
    }
    if (!res.ok) throw new Error(String(body.message || body.error || `Anfrage fehlgeschlagen (${res.status})`))
    setField((body as unknown as SelectionTestPlayer)[field])
    return 'applied'
  }

  return { players, isLoading, error, migrationPending, refetch: fetchRoster, saveScore }
}
