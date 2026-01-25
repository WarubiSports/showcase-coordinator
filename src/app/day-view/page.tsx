'use client'

import { AppShell } from '@/components/app-shell'
import { DayScheduleView } from '@/components/schedule/day-schedule-view'
import { VenueMap } from '@/components/venue/venue-map'
import { useUser } from '@/hooks/use-user'

export default function DayViewPage() {
  const { userName } = useUser()

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Event Day Coordination</h1>
          <p className="text-muted-foreground">Granular day-by-day schedule for Fri-Sat-Sun</p>
        </div>

        <VenueMap userName={userName || 'Unknown'} />

        <DayScheduleView userName={userName || 'Unknown'} />
      </div>
    </AppShell>
  )
}
