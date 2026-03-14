'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ShowcaseEvent } from '@/types'

const STORAGE_KEY = 'showcase_selected_event'

interface EventContextValue {
  events: ShowcaseEvent[]
  currentEvent: ShowcaseEvent | null
  setCurrentEvent: (event: ShowcaseEvent) => void
  isLoading: boolean
  refetchEvents: () => Promise<void>
}

const EventContext = createContext<EventContextValue | null>(null)

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<ShowcaseEvent[]>([])
  const [currentEvent, setCurrentEventState] = useState<ShowcaseEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('showcase_events')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Failed to fetch events:', error)
      return
    }

    const fetched = data as ShowcaseEvent[]
    setEvents(fetched)

    // Restore selected event from localStorage, or pick the first
    const savedId = localStorage.getItem(STORAGE_KEY)
    const saved = savedId ? fetched.find(e => e.id === savedId) : null
    setCurrentEventState(saved || fetched[0] || null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const setCurrentEvent = (event: ShowcaseEvent) => {
    setCurrentEventState(event)
    localStorage.setItem(STORAGE_KEY, event.id)
  }

  return (
    <EventContext.Provider value={{ events, currentEvent, setCurrentEvent, isLoading, refetchEvents: fetchEvents }}>
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useEvent must be used within EventProvider')
  return ctx
}
