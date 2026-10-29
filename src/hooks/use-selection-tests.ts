'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TEST_FIELDS, type SelectionTestPlayer, type TestField } from '@/lib/selection-tests'
import { createScoreQueue, mergeFetched, type SaveOutcome } from '@/lib/score-sync'

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
  const [queue] = useState(createScoreQueue)
  const lastLoad = useRef(0)

  // A reload keeps the fields saved or queued since it started, and an older reload answering late is dropped
  const fetchRoster = useCallback(async () => {
    const load = ++lastLoad.current
    const since = queue.now()
    setIsLoading(true)
    setError(null)
    try {
      if (!eventId) { setPlayers([]); return }
      const body = await call<{ players: SelectionTestPlayer[]; migrationPending: boolean }>(
        `/api/admin/invites/tests?event_id=${encodeURIComponent(eventId)}`,
      )
      if (load !== lastLoad.current) return
      setPlayers((prev) => mergeFetched(body.players, prev, TEST_FIELDS, (id, f) => queue.touchedSince(`${id}:${f}`, since)))
      setMigrationPending(body.migrationPending)
    } catch (err) {
      if (load === lastLoad.current) setError(err instanceof Error ? err.message : 'Kader konnte nicht geladen werden')
    } finally {
      if (load === lastLoad.current) setIsLoading(false)
    }
  }, [eventId, queue])

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  // Saves one field, queued behind earlier saves of the same field. Every answer puts what the server stored on the
  // page, in order; only the latest save's answer reports back to the input ('stale' for the others). A conflict
  // (someone else changed it) throws the stored value.
  const saveScore = async (playerId: string, field: TestField, value: number | null, onScreen: number | null): Promise<SaveOutcome> => {
    if (!eventId) throw new Error('Kein Event ausgewählt')
    const setField = (v: number | null) => setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, [field]: v } : p)))
    const settled = await queue.run(`${playerId}:${field}`, onScreen, async (expected) => {
      const res = await fetch('/api/admin/invites/tests', {
        method: 'PATCH',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, playerId, values: { [field]: value }, expected: { [field]: expected } }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 409 && body.current) {
        const current = (body.current as SelectionTestPlayer)[field]
        return { stored: current, conflict: current !== value }
      }
      if (!res.ok) throw new Error(String(body.message || body.error || `Anfrage fehlgeschlagen (${res.status})`))
      return { stored: (body as SelectionTestPlayer)[field], conflict: false }
    })
    if (settled.ok) setField(settled.result.stored)
    if (!settled.latest) return 'stale'
    if (!settled.ok) throw settled.error
    if (settled.result.conflict) throw new ScoreConflictError(settled.result.stored)
    return 'applied'
  }

  return { players, isLoading, error, migrationPending, refetch: fetchRoster, saveScore }
}
