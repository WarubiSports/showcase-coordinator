'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createTouchClock, mergeFetchedEntries, type EvaluationEntry, type EvaluationInput } from '@/lib/selection-evaluation'

// All evaluations of the event's Kader, and who is writing (null under the basic-auth login: read-only)
export const useEvaluations = (eventId: string | undefined) => {
  const [entries, setEntries] = useState<EvaluationEntry[]>([])
  const [scout, setScout] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clock] = useState(createTouchClock)
  const lastLoad = useRef(0)

  // A reload keeps own notes saved or saving since it started, and an older reload answering late is dropped
  const fetchEntries = useCallback(async () => {
    const load = ++lastLoad.current
    const since = clock.now()
    setError(null)
    if (!eventId) { setEntries([]); return }
    try {
      const res = await fetch(`/api/admin/invites/evaluations?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Anfrage fehlgeschlagen (${res.status})`)
      if (load !== lastLoad.current) return
      setEntries((prev) => mergeFetchedEntries(body.entries, prev, body.scout, (playerId) => clock.touchedSince(playerId, since)))
      setScout(body.scout)
    } catch (err) {
      if (load === lastLoad.current) setError(err instanceof Error ? err.message : 'Bewertungen konnten nicht geladen werden')
    }
  }, [eventId, clock])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Saves the own note. A version conflict reloads the notes (the form keeps its edits and takes the new version as
  // its save base) and throws the German explanation.
  const saveEvaluation = async (playerId: string, note: EvaluationInput, expectedVersion: number) => {
    if (!eventId) throw new Error('Kein Event ausgewählt')
    clock.touch(playerId)
    let res: Response
    let body: Record<string, unknown>
    try {
      res = await fetch('/api/admin/invites/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, playerId, expectedVersion, note }),
        cache: 'no-store',
      })
      body = await res.json().catch(() => ({}))
    } finally {
      // settled: a reload started from here on takes the server's own note again
      clock.touch(playerId)
    }
    if (res.status === 409) {
      await fetchEntries()
      throw new Error(String(body.message || 'Inzwischen woanders gespeichert, bitte prüfen'))
    }
    if (!res.ok) throw new Error(String(body.error || `Speichern fehlgeschlagen (${res.status})`))
    const saved = body as unknown as EvaluationEntry
    setEntries((prev) => [saved, ...prev.filter((e) => !(e.playerId === saved.playerId && e.scout === saved.scout))])
  }

  return { entries, scout, error, refetch: fetchEntries, saveEvaluation }
}
