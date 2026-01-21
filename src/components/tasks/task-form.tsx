'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Task, TaskPriority, Category } from '@/types'

interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (task: TaskFormData) => Promise<void>
  categories: Category[]
  task?: Task | null
  userName: string
}

export interface TaskFormData {
  title: string
  description?: string
  category_id?: string
  priority: TaskPriority
  assignee?: string
  deadline?: string
  scheduled_date?: string
  scheduled_time?: string
}

export function TaskForm({ open, onClose, onSubmit, categories, task, userName }: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    priority: 'medium',
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || undefined,
        category_id: task.category_id || undefined,
        priority: task.priority,
        assignee: task.assignee || undefined,
        deadline: task.deadline || undefined,
        scheduled_date: task.scheduled_date || undefined,
        scheduled_time: task.scheduled_time?.slice(0, 5) || undefined,
      })
    } else {
      setFormData({
        title: '',
        priority: 'medium',
        assignee: userName,
      })
    }
  }, [task, userName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
      setFormData({ title: '', priority: 'medium', assignee: userName })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value === 'none' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value as TaskPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Input
                id="assignee"
                value={formData.assignee || ''}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                placeholder="Assign to someone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline || ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Schedule Date</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Show on calendar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Schedule Time</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
