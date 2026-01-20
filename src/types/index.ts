export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Category {
  id: string
  name: string
  color: string
  icon: string | null
  sort_order: number
}

export interface Task {
  id: string
  title: string
  description: string | null
  category_id: string | null
  category?: Category
  status: TaskStatus
  priority: TaskPriority
  assignee: string | null
  deadline: string | null
  progress: number
  dependencies: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface Comment {
  id: string
  task_id: string
  author: string
  content: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  author: string
  pinned: boolean
  created_at: string
}

export interface Milestone {
  id: string
  title: string
  description: string | null
  target_date: string
  completed: boolean
  sort_order: number
}

export interface Activity {
  id: string
  entity_type: 'task' | 'announcement' | 'milestone'
  entity_id: string
  action: 'created' | 'updated' | 'commented' | 'status_changed'
  actor: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface TaskFilters {
  category?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignee?: string
  search?: string
}

export interface ScheduleEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string
  end_time: string
  color: string
  location: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
