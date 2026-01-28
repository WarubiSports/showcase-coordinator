'use client'

import Link from 'next/link'
import { MoreVertical, Edit, Trash2, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'
import { useState, useMemo } from 'react'

interface TaskTableProps {
  tasks: Task[]
  isLoading: boolean
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

type SortField = 'title' | 'status' | 'priority' | 'deadline' | 'progress'
type SortDirection = 'asc' | 'desc'

export function TaskTable({ tasks, isLoading, onEdit, onDelete }: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>('deadline')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'status': {
          const statusOrder = { not_started: 0, in_progress: 1, complete: 2 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        }
        case 'priority': {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        }
        case 'deadline': {
          const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity
          const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity
          comparison = dateA - dateB
          break
        }
        case 'progress':
          comparison = a.progress - b.progress
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [tasks, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="w-[100px]">Progress</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(8)].map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">No tasks found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first task to get started
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">
              <SortableHeader field="title">Title</SortableHeader>
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead>
              <SortableHeader field="status">Status</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="priority">Priority</SortableHeader>
            </TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>
              <SortableHeader field="deadline">Deadline</SortableHeader>
            </TableHead>
            <TableHead className="w-[100px]">
              <SortableHeader field="progress">Progress</SortableHeader>
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status]
            const priorityConfig = PRIORITY_CONFIG[task.priority]
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'complete'

            return (
              <TableRow key={task.id}>
                <TableCell>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-medium hover:underline line-clamp-1"
                  >
                    {task.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {task.category ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.category.color }}
                      />
                      <span className="text-sm truncate max-w-[100px]">{task.category.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(statusConfig.bgColor, statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(priorityConfig.bgColor, priorityConfig.color)}>
                    {priorityConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm truncate max-w-[120px] block">
                    {task.assignee || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn('text-sm', isOverdue && 'text-red-500 font-medium')}>
                    {formatDate(task.deadline)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={task.progress} className="h-2 w-16" />
                    <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
