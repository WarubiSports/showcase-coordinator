'use client'

import Link from 'next/link'
import { Calendar, User, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const statusConfig = STATUS_CONFIG[task.status]
  const priorityConfig = PRIORITY_CONFIG[task.priority]

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'complete'

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/tasks/${task.id}`} className="font-semibold leading-tight truncate hover:underline">
              {task.title}
            </Link>
            {task.category && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: task.category.color }}
                />
                <span className="text-xs text-muted-foreground">{task.category.name}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn(statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </Badge>
          <Badge variant="outline" className={cn(priorityConfig.bgColor, priorityConfig.color)}>
            {priorityConfig.label}
          </Badge>
        </div>

        {task.progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-1.5" />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            {task.assignee && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{task.assignee}</span>
              </div>
            )}
            {task.deadline && (
              <div className={cn('flex items-center gap-1', isOverdue && 'text-red-500')}>
                <Calendar className="h-3 w-3" />
                <span>{formatDate(task.deadline)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick status change buttons */}
        <div className="flex gap-1 pt-2 border-t">
          {(['not_started', 'in_progress', 'complete'] as const).map((status) => (
            <Button
              key={status}
              variant={task.status === status ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => onStatusChange(task.id, status)}
            >
              {STATUS_CONFIG[status].label.split(' ')[0]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
