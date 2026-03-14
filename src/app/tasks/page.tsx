'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskKanban } from '@/components/tasks/task-kanban'
import { TaskTable } from '@/components/tasks/task-table'
import { TaskViewToggle, type TaskViewType } from '@/components/tasks/task-view-toggle'
import { TaskFiltersBar } from '@/components/tasks/task-filters'
import { TaskForm, type TaskFormData } from '@/components/tasks/task-form'
import { useTasks } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { useUser } from '@/hooks/use-user'
import { useEvent } from '@/contexts/event-context'
import { STORAGE_KEYS } from '@/lib/constants'
import type { Task, TaskFilters, TaskStatus } from '@/types'

export default function TasksPage() {
  const { userName } = useUser()
  const { currentEvent } = useEvent()
  const { categories } = useCategories()
  const [filters, setFilters] = useState<TaskFilters>({})
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks(currentEvent?.id, filters)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [view, setView] = useState<TaskViewType>('cards')

  // Load saved view preference
  useEffect(() => {
    const savedView = localStorage.getItem(STORAGE_KEYS.TASK_VIEW) as TaskViewType | null
    if (savedView && ['cards', 'kanban', 'list'].includes(savedView)) {
      setView(savedView)
    }
  }, [])

  // Save view preference
  const handleViewChange = (newView: TaskViewType) => {
    setView(newView)
    localStorage.setItem(STORAGE_KEYS.TASK_VIEW, newView)
  }

  // Get unique individual assignees from tasks (split comma-separated names)
  const assignees = useMemo(() => {
    const names = new Set<string>()
    tasks.forEach((task) => {
      if (task.assignee) {
        task.assignee.split(',').forEach((name) => {
          const trimmed = name.trim()
          if (trimmed) names.add(trimmed)
        })
      }
    })
    return Array.from(names).sort()
  }, [tasks])

  const handleCreateTask = async (data: TaskFormData) => {
    try {
      await createTask({
        ...data,
        created_by: userName || 'Unknown',
      })
      toast.success('Task created successfully')
    } catch {
      toast.error('Failed to create task')
      throw new Error('Failed to create task')
    }
  }

  const handleUpdateTask = async (data: TaskFormData) => {
    if (!editingTask) return
    try {
      await updateTask(editingTask.id, data, userName || 'Unknown')
      toast.success('Task updated successfully')
      setEditingTask(null)
    } catch {
      toast.error('Failed to update task')
      throw new Error('Failed to update task')
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(id)
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateTask(id, { status: status as TaskStatus }, userName || 'Unknown')
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingTask(null)
  }

  const renderTaskView = () => {
    const commonProps = {
      tasks,
      isLoading,
      onEdit: handleEdit,
      onDelete: handleDeleteTask,
      onStatusChange: handleStatusChange,
    }

    switch (view) {
      case 'kanban':
        return <TaskKanban {...commonProps} />
      case 'list':
        return <TaskTable {...commonProps} />
      default:
        return <TaskList {...commonProps} />
    }
  }

  return (
    <AppShell selectedCategory={filters.category || null} onCategorySelect={(cat) => setFilters({ ...filters, category: cat || undefined })}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">Manage and track all showcase tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <TaskViewToggle view={view} onViewChange={handleViewChange} />
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        <TaskFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          assignees={assignees}
        />

        {renderTaskView()}

        <TaskForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
          categories={categories}
          task={editingTask}
          userName={userName || ''}
        />
      </div>
    </AppShell>
  )
}
