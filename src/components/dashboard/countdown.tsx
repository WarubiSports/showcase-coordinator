'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useEvent } from '@/contexts/event-context'
import { getEventStartDate } from '@/lib/constants'
import { CheckCircle2, FileText } from 'lucide-react'

type EventStatus = 'upcoming' | 'live' | 'ended' | 'template'

interface TimeUnit {
  value: number
  label: string
}

function isTemplate(event: { slug: string }): boolean {
  return event.slug.startsWith('template-')
}

function getEventStatus(event: { slug: string; start_date: string; end_date: string }): EventStatus {
  if (isTemplate(event)) return 'template'
  const now = new Date()
  const endDate = new Date(event.end_date + 'T23:59:59')
  const startDate = new Date(event.start_date + 'T00:00:00')

  if (now > endDate) return 'ended'
  if (now >= startDate) return 'live'
  return 'upcoming'
}

function getTimeRemaining(target: Date | null): TimeUnit[] {
  if (!target) return []
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return []

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return [
    { value: days, label: 'Days' },
    { value: hours, label: 'Hours' },
    { value: minutes, label: 'Minutes' },
    { value: seconds, label: 'Seconds' },
  ]
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`
  }
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
}

export function CountdownTimer() {
  const { currentEvent } = useEvent()
  const eventStart = useMemo(() => getEventStartDate(currentEvent), [currentEvent])
  const [timeUnits, setTimeUnits] = useState<TimeUnit[]>(getTimeRemaining(eventStart))
  const status = currentEvent ? getEventStatus(currentEvent) : 'upcoming'

  useEffect(() => {
    if (status !== 'upcoming') return
    setTimeUnits(getTimeRemaining(eventStart))
    const interval = setInterval(() => {
      setTimeUnits(getTimeRemaining(eventStart))
    }, 1000)
    return () => clearInterval(interval)
  }, [eventStart, status])

  if (!currentEvent) return null

  const cardClass = status === 'ended' || status === 'template'
    ? 'bg-muted/50 border-border'
    : 'bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20'

  return (
    <Card className={cardClass}>
      <CardContent className="py-6">
        <div className="text-center space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{currentEvent.name}</h2>
            {status === 'template' ? (
              <p className="text-muted-foreground">
                Reusable template &bull; Clone this when creating a new event
              </p>
            ) : (
              <p className="text-muted-foreground">
                {formatDateRange(currentEvent.start_date, currentEvent.end_date)} &bull; {currentEvent.location}
              </p>
            )}
          </div>

          {status === 'template' ? (
            <div className="py-4 flex items-center justify-center gap-2">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <span className="text-xl font-semibold text-muted-foreground">
                Template
              </span>
            </div>
          ) : status === 'ended' ? (
            <div className="py-4 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <span className="text-xl font-semibold text-muted-foreground">
                Event Completed
              </span>
            </div>
          ) : status === 'live' ? (
            <div className="py-4">
              <span className="text-3xl font-bold text-primary animate-pulse">
                Event Live!
              </span>
            </div>
          ) : (
            <div className="flex justify-center gap-4 sm:gap-8">
              {timeUnits.map((unit, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary tabular-nums">
                    {unit.value.toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
