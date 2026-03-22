'use client'

import { AppShell } from '@/components/app-shell'
import { CountdownTimer } from '@/components/dashboard/countdown'
import { HeroStats } from '@/components/dashboard/hero-stats'
import { PlayersOverview } from '@/components/dashboard/players-overview'
import { AttendeesOverview } from '@/components/dashboard/attendees-overview'
import { MyTasks } from '@/components/dashboard/my-tasks'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { useTasks } from '@/hooks/use-tasks'
import { usePlayers } from '@/hooks/use-players'
import { useAttendees } from '@/hooks/use-attendees'
import { useUser } from '@/hooks/use-user'
import { useEvent } from '@/contexts/event-context'

export default function DashboardPage() {
  const { currentEvent } = useEvent()
  const { tasks, isLoading: tasksLoading } = useTasks(currentEvent?.id)
  const { players, isLoading: playersLoading } = usePlayers(currentEvent?.id)
  const { attendees, isLoading: attendeesLoading } = useAttendees(currentEvent?.id)
  const { userName } = useUser()

  const isLoading = tasksLoading || playersLoading || attendeesLoading

  return (
    <AppShell>
      <div className="space-y-6">
        <CountdownTimer />

        <QuickActions event={currentEvent} players={players} />

        <HeroStats
          players={players}
          attendees={attendees}
          tasks={tasks}
          isLoading={isLoading}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <PlayersOverview players={players} isLoading={playersLoading} />
          <div className="space-y-4">
            <AttendeesOverview attendees={attendees} isLoading={attendeesLoading} />
            <MyTasks tasks={tasks} userName={userName} isLoading={tasksLoading} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
