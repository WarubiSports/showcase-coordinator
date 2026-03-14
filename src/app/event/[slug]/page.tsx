'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useEvent } from '@/contexts/event-context'

export default function EventLandingPage() {
  const params = useParams()
  const router = useRouter()
  const { events, setCurrentEvent, isLoading } = useEvent()
  const [error, setError] = useState<string | null>(null)

  const slug = params.slug as string

  useEffect(() => {
    if (isLoading || events.length === 0) return

    const event = events.find(e => e.slug === slug)
    if (!event) {
      setError(`Event "${slug}" not found`)
      return
    }

    // Set the event and mark as slug-locked
    setCurrentEvent(event, slug)
    router.replace('/')
  }, [isLoading, events, slug, setCurrentEvent, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Event Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading event...</div>
    </div>
  )
}
