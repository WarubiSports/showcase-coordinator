'use client'

import { useState, useEffect, useCallback } from 'react'
import type { EvaluationEntry, EvaluationInput } from '@/lib/selection-evaluation'

// All evaluations of the event's Kader, and who is writing (null under the basic-auth login: read-only)
export const useEvaluations = (eventId: string | undefined) => {
  const [entries, setEntries] = useState<EvaluationEntry[]>([])
  const [scout, setScout] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setError(null)
    if (!eventId) { setEntries([]); return }
    try {
      const res = await fetch(`/api/admin/invites/evaluations?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Anfrage fehlgeschlagen (${res.status})`)
      setEntries(body.entries)
      setScout(body.scout)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bewertungen konnten nicht geladen werden')
    }
  }, [eventId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Saves the own note. A version conflict reloads everything and throws the German explanation.
  const saveEvaluation = async (playerId: string, note: EvaluationInput, expectedVersion: number) => {
    if (!eventId) throw new Error('Kein Event ausgewählt')
    const res = await fetch('/api/admin/invites/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, playerId, expectedVersion, note }),
      cache: 'no-store',
    })
    const body = await res.json().catch(() => ({}))
    if (res.status === 409) {
      await fetchEntries()
      throw new Error(body.message || 'Inzwischen woanders gespeichert, bitte prüfen')
    }
    if (!res.ok) throw new Error(body.error || `Speichern fehlgeschlagen (${res.status})`)
    const saved = body as EvaluationEntry
    setEntries((prev) => [saved, ...prev.filter((e) => !(e.playerId === saved.playerId && e.scout === saved.scout))])
  }

  return { entries, scout, error, refetch: fetchEntries, saveEvaluation }
}
