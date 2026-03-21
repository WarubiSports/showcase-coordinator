'use client'

import { AppShell } from '@/components/app-shell'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'
import { useUser } from '@/hooks/use-user'
import { useEvent } from '@/contexts/event-context'

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (startDate === endDate) return start.toLocaleDateString('en-US', opts)
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', opts)}`
}

export default function SchedulePage() {
  const { userName } = useUser()
  const { currentEvent } = useEvent()

  const dateLabel = currentEvent
    ? formatDateRange(currentEvent.start_date, currentEvent.end_date)
    : ''

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">
            {currentEvent ? `Plan the event schedule for ${dateLabel}` : 'Loading event...'}
          </p>
        </div>

        <ScheduleGrid userName={userName || 'Unknown'} />
      </div>
    </AppShell>
  )
}
