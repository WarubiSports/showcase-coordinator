'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import type { Task } from '@/types'
import Link from 'next/link'

interface MyTasksProps {
  tasks: Task[]
  userName: string | null
  isLoading: boolean
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-gray-300',
}

export function MyTasks({ tasks, userName, isLoading }: MyTasksProps) {
  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />
  }

  // Filter to incomplete tasks, sorted by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  const incompleteTasks = tasks
    .filter((t) => t.status !== 'complete')
    .sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3))

  // If user is set, show their tasks first, then unassigned
  const myTasks = userName
    ? incompleteTasks.filter(
        (t) => t.assignee?.toLowerCase().includes(userName.toLowerCase()) || !t.assignee
      )
    : incompleteTasks

  const displayTasks = myTasks.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {userName ? 'Your Tasks' : 'Open Tasks'}
          </CardTitle>
          {incompleteTasks.length > 0 && (
            <Link href="/tasks" className="text-xs text-primary hover:underline">
              View all ({incompleteTasks.length})
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayTasks.length > 0 ? (
          <div className="space-y-1.5">
            {displayTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className={`flex items-center gap-3 py-2 px-3 rounded-md border-l-3 hover:bg-muted/50 transition-colors ${
                  PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low
                }`}
              >
                {task.status === 'in_progress' ? (
                  <Circle className="h-4 w-4 text-blue-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.category && (
                      <span className="text-[10px] text-muted-foreground">{task.category.name}</span>
                    )}
                    {task.deadline && (
                      <span className="text-[10px] text-muted-foreground">
                        Due {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 shrink-0 ${
                    task.priority === 'urgent'
                      ? 'border-red-300 text-red-600'
                      : task.priority === 'high'
                      ? 'border-orange-300 text-orange-600'
                      : ''
                  }`}
                >
                  {task.priority}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
            <p className="text-sm">All caught up!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
