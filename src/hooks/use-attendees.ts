'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Attendee, AttendeeRole, AttendeeAvailability } from '@/types'

interface AttendeeFilters {
  role?: AttendeeRole
  search?: string
  date?: string
}

export function useAttendees(filters?: AttendeeFilters) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendees = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('showcase_attendees')
        .select('*')
        .order('name')

      if (filters?.role) {
        query = query.contains('roles', [filters.role])
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Parse JSON fields if stored as string
      const parsedData: Attendee[] = (data || []).map((a) => ({
        ...a,
        roles: typeof a.roles === 'string'
          ? JSON.parse(a.roles)
          : a.roles || [],
        availability: typeof a.availability === 'string'
          ? JSON.parse(a.availability)
          : a.availability || [],
      }))

      // Filter by date if specified (client-side since availability is JSON)
      let filteredData = parsedData
      if (filters?.date) {
        filteredData = parsedData.filter((a) =>
          a.availability.some((av) => av.date === filters.date)
        )
      }

      setAttendees(filteredData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendees')
    } finally {
      setIsLoading(false)
    }
  }, [filters?.role, filters?.search, filters?.date])

  useEffect(() => {
    fetchAttendees()
  }, [fetchAttendees])

  const createAttendee = async (attendee: {
    name: string
    email?: string
    roles: AttendeeRole[]
    phone?: string
    notes?: string
    availability: AttendeeAvailability[]
    created_by: string
  }) => {
    const { data, error } = await supabase
      .from('showcase_attendees')
      .insert([{
        ...attendee,
        availability: JSON.stringify(attendee.availability),
      }])
      .select()
      .single()

    if (error) throw error

    const newAttendee: Attendee = {
      ...data,
      availability: attendee.availability,
    }

    setAttendees((prev) => [...prev, newAttendee].sort((a, b) => a.name.localeCompare(b.name)))
    return newAttendee
  }

  const updateAttendee = async (
    id: string,
    updates: Partial<Omit<Attendee, 'id' | 'created_at'>>
  ) => {
    const updateData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (updates.availability) {
      updateData.availability = JSON.stringify(updates.availability)
    }

    const { data, error } = await supabase
      .from('showcase_attendees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const updatedAttendee: Attendee = {
      ...data,
      roles: typeof data.roles === 'string' ? JSON.parse(data.roles) : data.roles || [],
      availability: updates.availability ||
        (typeof data.availability === 'string' ? JSON.parse(data.availability) : data.availability),
    }

    setAttendees((prev) =>
      prev.map((a) => (a.id === id ? updatedAttendee : a))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    return updatedAttendee
  }

  const deleteAttendee = async (id: string) => {
    const { error } = await supabase.from('showcase_attendees').delete().eq('id', id)
    if (error) throw error
    setAttendees((prev) => prev.filter((a) => a.id !== id))
  }

  return {
    attendees,
    isLoading,
    error,
    refetch: fetchAttendees,
    createAttendee,
    updateAttendee,
    deleteAttendee,
  }
}
