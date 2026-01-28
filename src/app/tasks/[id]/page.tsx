'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, User, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TaskComments } from '@/components/tasks/task-comments'
import { TaskForm, type TaskFormData } from '@/components/tasks/task-form'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/hooks/use-categories'
import { useUser } from '@/hooks/use-user'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority, Category } from '@/types'

interface TaskWithCategory extends Omit<Task, 'category'> {
  showcase_categories: Category | null
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { userName } = useUser()
  const { categories } = useCategories()

  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const taskId = params.id as string

  useEffect(() => {
    const fetchTask = async () => {
      const { data, error } = await supabase
        .from('showcase_tasks')
        .select('*, showcase_categories(*)')
        .eq('id', taskId)
        .single()

      if (error || !data) {
        toast.error('Task not found')
        router.push('/tasks')
        return
      }

      const taskWithCategory = data as TaskWithCategory
      setTask({
        ...taskWithCategory,
        status: taskWithCategory.status as TaskStatus,
        priority: taskWithCategory.priority as TaskPriority,
        category: taskWithCategory.showcase_categories || undefined,
      })
      setIsLoading(false)
    }

    fetchTask()
  }, [taskId, router])

  const handleUpdate = async (data: TaskFormData) => {
    const { data: updated, error } = await supabase
      .from('showcase_tasks')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: userName,
      })
      .eq('id', taskId)
      .select('*, showcase_categories(*)')
      .single()

    if (error) {
      toast.error('Failed to update task')
      throw error
    }

    const taskWithCategory = updated as TaskWithCategory
    setTask({
      ...taskWithCategory,
      status: taskWithCategory.status as TaskStatus,
      priority: taskWithCategory.priority as TaskPriority,
      category: taskWithCategory.showcase_categories || undefined,
    })

    toast.success('Task updated')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return

    const { error } = await supabase.from('showcase_tasks').delete().eq('id', taskId)

    if (error) {
      toast.error('Failed to delete task')
      return
    }

    toast.success('Task deleted')
    router.push('/tasks')
  }

  const handleStatusChange = async (status: TaskStatus) => {
    const { data: updated, error } = await supabase
      .from('showcase_tasks')
      .update({
        status,
        updated_at: new Date().toISOString(),
        updated_by: userName,
      })
      .eq('id', taskId)
      .select('*, showcase_categories(*)')
      .single()

    if (error) {
      toast.error('Failed to update status')
      return
    }

    const taskWithCategory = updated as TaskWithCategory
    setTask({
      ...taskWithCategory,
      status: taskWithCategory.status as TaskStatus,
      priority: taskWithCategory.priority as TaskPriority,
      category: taskWithCategory.showcase_categories || undefined,
    })

    // Log activity
    await supabase.from('showcase_activity').insert([
      {
        entity_type: 'task',
        entity_id: taskId,
        action: 'status_changed',
        actor: userName,
        details: { status },
      },
    ])

    toast.success('Status updated')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </AppShell>
    )
  }

  if (!task) return null

  const statusConfig = STATUS_CONFIG[task.status]
  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'complete'

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => router.push('/tasks')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>

        {/* Task details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                {task.category && (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: task.category.color }}
                    />
                    <span className="text-sm text-muted-foreground">{task.category.name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setIsFormOpen(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn(statusConfig.bgColor, statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className={cn(priorityConfig.bgColor, priorityConfig.color)}>
                {priorityConfig.label} Priority
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Progress */}
            {task.progress > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-2" />
              </div>
            )}

            {/* Meta info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {task.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="font-medium">{task.assignee}</span>
                </div>
              )}
              {task.deadline && (
                <div className={cn('flex items-center gap-2 text-sm', isOverdue && 'text-red-500')}>
                  <Calendar className="h-4 w-4" />
                  <span className={cn(!isOverdue && 'text-muted-foreground')}>Deadline:</span>
                  <span className="font-medium">{formatDate(task.deadline)}</span>
                </div>
              )}
            </div>

            {/* Quick status change */}
            <div>
              <h3 className="font-semibold mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {(['not_started', 'in_progress', 'complete'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={task.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                  >
                    {STATUS_CONFIG[status].label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <TaskComments taskId={taskId} userName={userName || 'Unknown'} />
          </CardContent>
        </Card>

        {/* Edit form */}
        <TaskForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleUpdate}
          categories={categories}
          task={task}
          userName={userName || ''}
        />
      </div>
    </AppShell>
  )
}
