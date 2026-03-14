'use client'

import { AppShell } from '@/components/app-shell'
import { CountdownTimer } from '@/components/dashboard/countdown'
import { ProgressOverview } from '@/components/dashboard/progress-overview'
import { AssigneeView } from '@/components/dashboard/assignee-view'
import { MilestonesTimeline } from '@/components/dashboard/milestones'
import { useTasks } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { useEvent } from '@/contexts/event-context'

export default function DashboardPage() {
  const { currentEvent } = useEvent()
  const { tasks, isLoading } = useTasks(currentEvent?.id)
  const { categories } = useCategories()

  return (
    <AppShell>
      <div className="space-y-6">
        <CountdownTimer />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <>
            <ProgressOverview tasks={tasks} categories={categories} />

            <div className="grid gap-4 md:grid-cols-2">
              <AssigneeView tasks={tasks} />
              <MilestonesTimeline />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
