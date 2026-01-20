'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskFiltersBar } from '@/components/tasks/task-filters'
import { TaskForm, type TaskFormData } from '@/components/tasks/task-form'
import { useTasks } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { useUser } from '@/hooks/use-user'
import type { Task, TaskFilters, TaskStatus } from '@/types'

export default function TasksPage() {
  const { userName } = useUser()
  const { categories } = useCategories()
  const [filters, setFilters] = useState<TaskFilters>({})
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks(filters)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Get unique assignees from tasks
  const assignees = useMemo(() => {
    const names = new Set<string>()
    tasks.forEach((task) => {
      if (task.assignee) names.add(task.assignee)
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

  return (
    <AppShell selectedCategory={filters.category || null} onCategorySelect={(cat) => setFilters({ ...filters, category: cat || undefined })}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">Manage and track all showcase tasks</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <TaskFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          assignees={assignees}
        />

        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
        />

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
