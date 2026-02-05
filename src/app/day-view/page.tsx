'use client'

import { AppShell } from '@/components/app-shell'
import { StaffTimeline } from '@/components/schedule/staff-timeline'
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
          <p className="text-muted-foreground">Staff schedule, venue map, and detailed day management</p>
        </div>

        <StaffTimeline userName={userName || 'Unknown'} />

        <VenueMap userName={userName || 'Unknown'} />

        <DayScheduleView userName={userName || 'Unknown'} />
      </div>
    </AppShell>
  )
}
