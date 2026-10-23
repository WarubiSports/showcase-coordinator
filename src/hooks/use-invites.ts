'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InviteWithPlayer } from '@/types'

const adminFetch = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`) as Error & { code?: string }
    err.code = body.error
    throw err
  }
  return body as T
}

export interface NewInviteInput {
  name: string
  phone?: string
  invited_by: string
  personal_line?: string
  profile_url?: string
  ausa_athlete_id?: string
  category?: 'signed' | 'new'
}

export function useInvites(eventId: string | undefined) {
  const [invites, setInvites] = useState<InviteWithPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [migrationPending, setMigrationPending] = useState(false)

  const fetchInvites = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!eventId) { setInvites([]); return }
      setInvites(await adminFetch<InviteWithPlayer[]>(`/api/admin/invites?event_id=${encodeURIComponent(eventId)}`))
      setMigrationPending(false)
    } catch (err) {
      const e = err as Error & { code?: string }
      if (e.code === 'migration_pending') setMigrationPending(true)
      else setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const createInvites = async (rows: NewInviteInput[]) => {
    if (!eventId) throw new Error('No event selected')
    const created = await adminFetch<InviteWithPlayer[]>('/api/admin/invites', {
      method: 'POST',
      body: JSON.stringify({ eventId, invites: rows }),
    })
    setInvites((prev) => [...prev, ...created])
    return created
  }

  const updateInvite = async (id: string, patch: Partial<Pick<InviteWithPlayer, 'name' | 'phone' | 'invited_by' | 'personal_line' | 'profile_url' | 'ausa_athlete_id' | 'category' | 'status'>>) => {
    const updated = await adminFetch<InviteWithPlayer>(`/api/admin/invites/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    setInvites((prev) => prev.map((i) => (i.id === id ? updated : i)))
    return updated
  }

  const deleteInvite = async (id: string) => {
    await adminFetch(`/api/admin/invites/${id}`, { method: 'DELETE' })
    setInvites((prev) => prev.filter((i) => i.id !== id))
  }

  // Reads the FuPa page behind the invite's profile link and stores photo, club, league, position and stats
  const enrichInvite = async (id: string) => {
    const updated = await adminFetch<InviteWithPlayer>(`/api/admin/invites/${id}/enrich`, { method: 'POST', body: '{}' })
    setInvites((prev) => prev.map((i) => (i.id === id ? updated : i)))
    return updated
  }

  // Shirt number lives on the sign-up row; the invite route writes it for the invite's own sign-up only
  const setJerseyNumber = async (inviteId: string, jersey_number: number | null) => {
    const updated = await adminFetch<InviteWithPlayer>(`/api/admin/invites/${inviteId}`, { method: 'PATCH', body: JSON.stringify({ jersey_number }) })
    setInvites((prev) => prev.map((i) => (i.id === inviteId ? updated : i)))
  }

  return { invites, isLoading, error, migrationPending, refetch: fetchInvites, createInvites, updateInvite, deleteInvite, enrichInvite, setJerseyNumber }
}
