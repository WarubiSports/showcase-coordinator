'use client'

import { supabase } from '@/lib/supabase'
import type { ShowcaseEvent, ShowcaseEventType } from '@/types'

interface CreateEventInput {
  name: string
  slug: string
  location: string
  start_date: string
  end_date: string
  start_time?: string
  description?: string
  type?: ShowcaseEventType
}

export function useEvents() {
  const createEvent = async (input: CreateEventInput): Promise<ShowcaseEvent> => {
    const { data, error } = await supabase
      .from('showcase_events')
      .insert([{
        ...input,
        type: input.type || 'showcase',
      }])
      .select()
      .single()

    if (error) throw error

    // Seed default day_groups for the new event
    const defaultGroups = [
      { name: 'General', color: '#6b7280', sort_order: 0, event_id: data.id },
      { name: 'Group A', color: '#3b82f6', sort_order: 1, event_id: data.id },
      { name: 'Group B', color: '#ef4444', sort_order: 2, event_id: data.id },
    ]

    await supabase.from('showcase_day_groups').insert(defaultGroups)

    return data as ShowcaseEvent
  }

  const updateEvent = async (id: string, updates: Partial<CreateEventInput>): Promise<ShowcaseEvent> => {
    const { data, error } = await supabase
      .from('showcase_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as ShowcaseEvent
  }

  const deleteEvent = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('showcase_events')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return { createEvent, updateEvent, deleteEvent }
}
