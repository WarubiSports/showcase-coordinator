'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useEvent } from '@/contexts/event-context'
import { getEventStartDate } from '@/lib/constants'

interface TimeUnit {
  value: number
  label: string
}

function getTimeRemaining(target: Date | null): TimeUnit[] {
  if (!target) return []
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) {
    return [{ value: 0, label: 'Event Live!' }]
  }

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
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
}

export function CountdownTimer() {
  const { currentEvent } = useEvent()
  const eventStart = useMemo(() => getEventStartDate(currentEvent), [currentEvent])
  const [timeUnits, setTimeUnits] = useState<TimeUnit[]>(getTimeRemaining(eventStart))

  useEffect(() => {
    setTimeUnits(getTimeRemaining(eventStart))
    const interval = setInterval(() => {
      setTimeUnits(getTimeRemaining(eventStart))
    }, 1000)
    return () => clearInterval(interval)
  }, [eventStart])

  const isLive = timeUnits.length === 1 && timeUnits[0].label === 'Event Live!'

  if (!currentEvent) return null

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="py-6">
        <div className="text-center space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{currentEvent.name}</h2>
            <p className="text-muted-foreground">
              {formatDateRange(currentEvent.start_date, currentEvent.end_date)} &bull; {currentEvent.location}
            </p>
          </div>

          {isLive ? (
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
