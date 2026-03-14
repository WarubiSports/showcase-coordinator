'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ShowcaseEvent } from '@/types'

const STORAGE_KEY = 'showcase_selected_event'
const SLUG_KEY = 'showcase_event_slug'

interface EventContextValue {
  events: ShowcaseEvent[]
  currentEvent: ShowcaseEvent | null
  pastEvents: ShowcaseEvent[]
  setCurrentEvent: (event: ShowcaseEvent, slug?: string) => void
  unlockEvents: () => void
  isLoading: boolean
  isSlugLocked: boolean
  refetchEvents: () => Promise<void>
}

const EventContext = createContext<EventContextValue | null>(null)

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<ShowcaseEvent[]>([])
  const [currentEvent, setCurrentEventState] = useState<ShowcaseEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSlugLocked, setIsSlugLocked] = useState(false)

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

    // Check if slug-locked from a previous /event/[slug] visit
    const savedSlug = localStorage.getItem(SLUG_KEY)
    if (savedSlug) {
      const slugEvent = fetched.find(e => e.slug === savedSlug)
      if (slugEvent) {
        setCurrentEventState(slugEvent)
        setIsSlugLocked(true)
        setIsLoading(false)
        return
      }
      // Slug no longer valid, clear it
      localStorage.removeItem(SLUG_KEY)
    }

    // Normal mode: restore from localStorage or pick first
    const savedId = localStorage.getItem(STORAGE_KEY)
    const saved = savedId ? fetched.find(e => e.id === savedId) : null
    setCurrentEventState(saved || fetched[0] || null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const setCurrentEvent = useCallback((event: ShowcaseEvent, slug?: string) => {
    setCurrentEventState(event)
    localStorage.setItem(STORAGE_KEY, event.id)
    if (slug) {
      localStorage.setItem(SLUG_KEY, slug)
      setIsSlugLocked(true)
    }
  }, [])

  const unlockEvents = useCallback(() => {
    localStorage.removeItem(SLUG_KEY)
    setIsSlugLocked(false)
  }, [])

  // Past events: events that ended before today, excluding current
  const now = new Date().toISOString().split('T')[0]
  const pastEvents = events.filter(e =>
    e.id !== currentEvent?.id && e.end_date < now
  )

  return (
    <EventContext.Provider value={{
      events,
      currentEvent,
      pastEvents,
      setCurrentEvent,
      unlockEvents,
      isLoading,
      isSlugLocked,
      refetchEvents: fetchEvents,
    }}>
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useEvent must be used within EventProvider')
  return ctx
}
