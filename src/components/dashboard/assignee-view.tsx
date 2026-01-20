'use client'

import { User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { STATUS_CONFIG } from '@/lib/constants'
import type { Task } from '@/types'

interface AssigneeViewProps {
  tasks: Task[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AssigneeView({ tasks }: AssigneeViewProps) {
  // Group tasks by assignee
  const assigneeMap = new Map<string, Task[]>()
  const unassigned: Task[] = []

  tasks.forEach((task) => {
    if (task.assignee) {
      const existing = assigneeMap.get(task.assignee) || []
      assigneeMap.set(task.assignee, [...existing, task])
    } else {
      unassigned.push(task)
    }
  })

  const assignees = Array.from(assigneeMap.entries())
    .map(([name, tasks]) => ({
      name,
      tasks,
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'complete').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignees.length === 0 && unassigned.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks created yet
          </p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {assignees.map((assignee) => (
              <div
                key={assignee.name}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(assignee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{assignee.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {assignee.total} task{assignee.total !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {assignee.inProgress > 0 && (
                    <Badge variant="outline" className={STATUS_CONFIG.in_progress.bgColor}>
                      {assignee.inProgress}
                    </Badge>
                  )}
                  {assignee.blocked > 0 && (
                    <Badge variant="outline" className={STATUS_CONFIG.blocked.bgColor}>
                      {assignee.blocked}
                    </Badge>
                  )}
                  {assignee.completed > 0 && (
                    <Badge variant="outline" className={STATUS_CONFIG.complete.bgColor}>
                      {assignee.completed}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {unassigned.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border-dashed border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                      ?
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm text-muted-foreground">Unassigned</div>
                    <div className="text-xs text-muted-foreground">
                      {unassigned.length} task{unassigned.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
