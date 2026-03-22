import type { TaskStatus, TaskPriority, ShowcaseEvent } from '@/types'

/** Generate event days array from a ShowcaseEvent's start_date and end_date */
export function getEventDays(event: ShowcaseEvent | null): { date: string; label: string; name: string }[] {
  if (!event) return []
  const days: { date: string; label: string; name: string }[] = []
  const start = new Date(event.start_date + 'T00:00:00')
  const end = new Date(event.end_date + 'T00:00:00')
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let dayNum = 1
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      date: d.toISOString().split('T')[0],
      label: dayNames[d.getDay()],
      name: `Day ${dayNum}`,
    })
    dayNum++
  }
  return days
}

/** Build a countdown Date from a ShowcaseEvent */
export function getEventStartDate(event: ShowcaseEvent | null): Date | null {
  if (!event) return null
  const time = event.start_time || '09:00:00'
  return new Date(`${event.start_date}T${time}`)
}

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
  USER_ROLE: 'showcase_user_role',
  LAST_VISIT: 'showcase_last_visit',
  TASK_VIEW: 'showcase_task_view',
}

export type UserRole = 'coach' | 'admin'

export const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'complete']
