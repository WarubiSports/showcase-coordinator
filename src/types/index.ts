// Venue Map Types
export type VenueZoneType = 'field' | 'registration' | 'catering' | 'medical' | 'parking' | 'other'

export interface VenueZone {
  id: string
  name: string
  description: string | null
  color: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zone_type: VenueZoneType | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'not_started' | 'in_progress' | 'complete'
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
  scheduled_date: string | null
  scheduled_time: string | null
  show_on_schedule: boolean
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

export type FeedbackType = 'bug' | 'feature' | 'idea' | 'other'
export type FeedbackImportance = 'nice_to_have' | 'helpful' | 'important' | 'critical'
export type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'done' | 'dismissed'

export interface Feedback {
  id: string
  type: FeedbackType
  description: string
  details: string | null
  importance: FeedbackImportance
  page_url: string | null
  screenshot_url: string | null
  ai_prompt: string | null
  status: FeedbackStatus
  submitted_by: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

// Day Schedule Types
export interface DayGroup {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface DayActivity {
  id: string
  event_date: string
  group_id: string | null
  group?: DayGroup
  start_time: string
  end_time: string | null
  activity: string
  responsible: string | null
  todos: string | null
  notes: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  event_date: string
  match_number: number
  start_time: string
  team_a: string
  team_b: string
  field: string | null
  referee: string | null
  score_a: number | null
  score_b: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  item: string
  category: string | null
  is_ready: boolean
  responsible: string | null
  notes: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  color: string | null
  notes: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AttendeeRole = 'staff' | 'alumni' | 'coach' | 'scout'

export interface AttendeeAvailability {
  date: string
  start_time: string
  end_time: string
}

export interface Attendee {
  id: string
  name: string
  email: string | null
  roles: AttendeeRole[]
  phone: string | null
  notes: string | null
  availability: AttendeeAvailability[]
  created_by: string | null
  created_at: string
  updated_at: string
}
