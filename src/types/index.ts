// Event Types
export type ShowcaseEventType = 'showcase' | 'id_camp' | 'futures'

export interface ShowcaseEvent {
  id: string
  name: string
  slug: string
  location: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  description: string | null
  type: ShowcaseEventType
  venue_lat: number | null
  venue_lng: number | null
  venue_zoom: number | null
  // Registration fields
  price: number | null
  currency: string
  age_min: number | null
  age_max: number | null
  registration_open: boolean
  registration_deadline: string | null
  max_players: number | null
  accent_color: string
  registration_details: string | null
  host_name: string | null
  host_logo_url: string | null
  created_at: string
  updated_at: string
}

export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface EventScout {
  id: string
  event_id: string
  name: string
  organization: string | null
  logo_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// Venue Map Types
export type VenueZoneType = 'field' | 'registration' | 'catering' | 'medical' | 'parking' | 'other'

export interface VenueZone {
  id: string
  event_id: string
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
  event_id: string
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
  event_id: string
  task_id: string
  author: string
  content: string
  created_at: string
}

export interface Announcement {
  id: string
  event_id: string
  title: string
  content: string
  author: string
  pinned: boolean
  created_at: string
}

export interface Milestone {
  id: string
  event_id: string
  title: string
  description: string | null
  target_date: string
  completed: boolean
  sort_order: number
}

export interface Activity {
  id: string
  event_id: string
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
  event_id: string
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
  event_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface DayActivity {
  id: string
  event_id: string
  event_date: string
  group_id: string | null
  group?: DayGroup
  start_time: string
  end_time: string | null
  activity: string
  responsible: string[] | null
  todos: string | null
  notes: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  event_id: string
  event_date: string
  match_number: number
  start_time: string
  team_a: string
  team_b: string
  field: string | null
  referee: string[] | null
  score_a: number | null
  score_b: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  event_id: string
  item: string
  category: string | null
  is_ready: boolean
  responsible: string[] | null
  notes: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  event_id: string
  name: string
  color: string | null
  notes: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AttendeeRole = 'staff' | 'alumni' | 'coach' | 'scout'

// Player Types
export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST'

export interface PlayerTestScores {
  broad_jump_1: number | null
  broad_jump_2: number | null
  sprint_1: number | null
  sprint_2: number | null
  high_jump_1: number | null
  high_jump_2: number | null
}

export interface Player {
  id: string
  event_id: string
  name: string
  position: PlayerPosition | null
  birth_year: number | null
  club: string | null
  country: string | null
  email: string | null
  phone: string | null
  // Test scores - 2 tries each
  broad_jump_1: number | null
  broad_jump_2: number | null
  sprint_1: number | null
  sprint_2: number | null
  high_jump_1: number | null
  high_jump_2: number | null
  notes: string | null
  // Registration fields
  parent_name: string | null
  parent_email: string | null
  parent_phone: string | null
  payment_status: PaymentStatus
  registered_at: string | null
  confirmation_sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AttendeeAvailability {
  date: string
  start_time: string
  end_time: string
}

export interface Attendee {
  id: string
  event_id: string
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
