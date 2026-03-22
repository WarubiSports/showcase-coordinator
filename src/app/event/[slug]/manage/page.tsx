'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEvent } from '@/contexts/event-context'
import { STORAGE_KEYS } from '@/lib/constants'
import { Loader2 } from 'lucide-react'

export default function EventManageEntry() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { events, setCurrentEvent, isLoading } = useEvent()
  const [error, setError] = useState<string | null>(null)

  const slug = params.slug as string
  const name = searchParams.get('name')

  useEffect(() => {
    if (isLoading || events.length === 0) return

    const event = events.find(e => e.slug === slug)
    if (!event) {
      setError(`Event "${slug}" not found`)
      return
    }

    // Set up the user as a coach for this event
    if (name) {
      localStorage.setItem(STORAGE_KEYS.USER_NAME, name)
    }
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'coach')

    setCurrentEvent(event, slug)
    router.replace('/')
  }, [isLoading, events, slug, name, setCurrentEvent, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Event Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Setting up event...</span>
      </div>
    </div>
  )
}
