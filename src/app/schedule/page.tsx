'use client'

import { AppShell } from '@/components/app-shell'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'
import { useUser } from '@/hooks/use-user'

export default function SchedulePage() {
  const { userName } = useUser()

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Plan the event schedule for Feb 6-8, 2026</p>
        </div>

        <ScheduleGrid userName={userName || 'Unknown'} />
      </div>
    </AppShell>
  )
}
