'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskFilters, TaskStatus, TaskPriority, Category } from '@/types'

interface TaskWithCategory extends Omit<Task, 'category'> {
  showcase_categories: Category | null
}

export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('showcase_tasks')
        .select('*, showcase_categories(*)')
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category_id', filters.category)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.assignee) {
        query = query.ilike('assignee', `%${filters.assignee}%`)
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const transformedTasks: Task[] = (data as TaskWithCategory[] || []).map((task) => ({
        ...task,
        status: task.status as TaskStatus,
        priority: task.priority as TaskPriority,
        category: task.showcase_categories || undefined,
      }))

      setTasks(transformedTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setIsLoading(false)
    }
  }, [filters?.category, filters?.status, filters?.priority, filters?.assignee, filters?.search])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = async (task: {
    title: string
    description?: string
    category_id?: string
    priority?: TaskPriority
    assignee?: string
    deadline?: string
    created_by: string
  }) => {
    const { data, error } = await supabase
      .from('showcase_tasks')
      .insert([task])
      .select('*, showcase_categories(*)')
      .single()

    if (error) throw error

    const taskWithCategory = data as TaskWithCategory
    const newTask: Task = {
      ...taskWithCategory,
      status: taskWithCategory.status as TaskStatus,
      priority: taskWithCategory.priority as TaskPriority,
      category: taskWithCategory.showcase_categories || undefined,
    }

    setTasks((prev) => [newTask, ...prev])

    // Log activity
    await supabase.from('showcase_activity').insert([
      {
        entity_type: 'task',
        entity_id: newTask.id,
        action: 'created',
        actor: task.created_by,
        details: { title: task.title },
      },
    ])

    return newTask
  }

  const updateTask = async (
    id: string,
    updates: Partial<Task>,
    updatedBy: string
  ) => {
    const { data, error } = await supabase
      .from('showcase_tasks')
      .update({ ...updates, updated_at: new Date().toISOString(), updated_by: updatedBy })
      .eq('id', id)
      .select('*, showcase_categories(*)')
      .single()

    if (error) throw error

    const taskWithCategory = data as TaskWithCategory
    const updatedTask: Task = {
      ...taskWithCategory,
      status: taskWithCategory.status as TaskStatus,
      priority: taskWithCategory.priority as TaskPriority,
      category: taskWithCategory.showcase_categories || undefined,
    }

    setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))

    // Log activity
    await supabase.from('showcase_activity').insert([
      {
        entity_type: 'task',
        entity_id: id,
        action: updates.status ? 'status_changed' : 'updated',
        actor: updatedBy,
        details: updates,
      },
    ])

    return updatedTask
  }

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('showcase_tasks').delete().eq('id', id)
    if (error) throw error
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  }
}
