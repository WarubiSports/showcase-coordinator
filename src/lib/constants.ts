import type { TaskStatus, TaskPriority } from '@/types'

export const EVENT_DATE = new Date('2026-02-07T09:00:00+01:00')
export const EVENT_END_DATE = new Date('2026-02-08T18:00:00+01:00')
export const EVENT_LOCATION = 'Cologne, Germany'

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  not_started: {
    label: 'Not Started',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  complete: {
    label: 'Complete',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
}

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: {
    label: 'Low',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
}

export const STORAGE_KEYS = {
  USER_NAME: 'showcase_user_name',
  LAST_VISIT: 'showcase_last_visit',
  TASK_VIEW: 'showcase_task_view',
}

export const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'complete']
