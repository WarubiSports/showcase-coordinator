'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, User, GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STATUS_CONFIG, PRIORITY_CONFIG, TASK_STATUSES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

interface TaskKanbanProps {
  tasks: Task[]
  isLoading: boolean
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  isOver: boolean
}

interface KanbanCardProps {
  task: Task
  onEdit: (task: Task) => void
}

function KanbanCard({ task, onEdit }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task, status: task.status } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'complete'

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
      )}
      onClick={() => onEdit(task)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <Link
              href={`/tasks/${task.id}`}
              className="text-sm font-medium leading-tight hover:underline line-clamp-2"
              onClick={(e) => e.stopPropagation()}
            >
              {task.title}
            </Link>
            {task.category && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.category.color }}
                />
                <span className="text-xs text-muted-foreground">{task.category.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn('text-xs', priorityConfig.bgColor, priorityConfig.color)}>
            {priorityConfig.label}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{task.assignee.split(',')[0]}</span>
            </div>
          )}
          {task.deadline && (
            <div className={cn('flex items-center gap-1', isOverdue && 'text-red-500')}>
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.deadline)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function KanbanColumn({ status, tasks, onEdit, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { status },
  })

  const config = STATUS_CONFIG[status]

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      <div className={cn('flex items-center gap-2 p-3 rounded-t-lg', config.bgColor)}>
        <span className={cn('font-medium', config.color)}>{config.label}</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors',
          isOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : 'bg-muted/30'
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onEdit={onEdit} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className={cn(
            'text-center text-sm py-8 rounded-lg border-2 border-dashed transition-colors',
            isOver ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          )}>
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  )
}

export function TaskKanban({ tasks, isLoading, onEdit, onStatusChange }: TaskKanbanProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      not_started: [],
      in_progress: [],
      blocked: [],
      complete: [],
    }
    tasks.forEach((task) => {
      grouped[task.status].push(task)
    })
    return grouped
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverColumn(null)
      return
    }

    // Check if over a column directly
    if (TASK_STATUSES.includes(over.id as TaskStatus)) {
      setOverColumn(over.id as TaskStatus)
      return
    }

    // Check if over a task - get that task's status
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask) {
      setOverColumn(overTask.status)
      return
    }

    setOverColumn(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveTask(null)
    setOverColumn(null)

    if (!over) return

    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    let targetStatus: TaskStatus | null = null

    // Dropped directly on a column
    if (TASK_STATUSES.includes(over.id as TaskStatus)) {
      targetStatus = over.id as TaskStatus
    } else {
      // Dropped on a task - use that task's status
      const overTask = tasks.find(t => t.id === over.id)
      if (overTask) {
        targetStatus = overTask.status
      }
    }

    // Only update if status changed
    if (targetStatus && targetStatus !== draggedTask.status) {
      onStatusChange(draggedTask.id, targetStatus)
    }
  }

  const handleDragCancel = () => {
    setActiveTask(null)
    setOverColumn(null)
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="min-w-[280px] max-w-[320px] flex-1">
            <div className="h-10 rounded-t-lg bg-muted animate-pulse" />
            <div className="bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px]">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onEdit={onEdit}
            isOver={overColumn === status}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <Card className="w-[280px] shadow-xl rotate-3 cursor-grabbing">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium line-clamp-2">{activeTask.title}</span>
                  {activeTask.category && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: activeTask.category.color }}
                      />
                      <span className="text-xs text-muted-foreground">{activeTask.category.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
