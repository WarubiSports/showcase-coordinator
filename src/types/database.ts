export type Database = {
  public: {
    Tables: {
      showcase_categories: {
        Row: {
          id: string
          name: string
          color: string
          icon: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          icon?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          icon?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      showcase_tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          category_id: string | null
          status: string
          priority: string
          assignee: string | null
          deadline: string | null
          progress: number
          dependencies: string[] | null
          created_by: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category_id?: string | null
          status?: string
          priority?: string
          assignee?: string | null
          deadline?: string | null
          progress?: number
          dependencies?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category_id?: string | null
          status?: string
          priority?: string
          assignee?: string | null
          deadline?: string | null
          progress?: number
          dependencies?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      showcase_comments: {
        Row: {
          id: string
          task_id: string
          author: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          author?: string
          content?: string
          created_at?: string
        }
      }
      showcase_announcements: {
        Row: {
          id: string
          title: string
          content: string
          author: string
          pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author: string
          pinned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author?: string
          pinned?: boolean
          created_at?: string
        }
      }
      showcase_milestones: {
        Row: {
          id: string
          title: string
          description: string | null
          target_date: string
          completed: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          target_date: string
          completed?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          target_date?: string
          completed?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      showcase_activity: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          actor: string
          details: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: string
          actor: string
          details?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: string
          actor?: string
          details?: Record<string, unknown> | null
          created_at?: string
        }
      }
    }
  }
}
