export interface User {
  id: string
  email: string
  display_name: string
  username: string | null
  customization_prompt: string | null
  avatar_url: string | null
  avatar_data: boolean | null  // true if DB has avatar bytes; actual bytes served via /api/avatar/[userId]
  partner_id: string | null
  google_refresh_token: string | null
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

export interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  due_date: string | null
  recurrence: 'daily' | 'weekly' | 'monthly' | null
  scheduled_time: string | null  // HH:MM:SS — time slot assigned via drag-and-drop
  parent_id: string | null       // set for sub-tasks; null for top-level todos
  index: string                  // fractional index for ordering within parent
  created_at: string
  subtasks_count?: number        // calculated field from Supabase
  motivation_nudge: string | null
  completion_nudge: string | null
  energy_level: 'low' | 'medium' | 'high'
  completed_at: string | null
  updated_at?: string
  deleted_at?: string | null
}

export interface QuestLink {
  icon: string
  name: string
  status: string
}


export interface Quest {
  id: string
  user_id: string
  name: string
  icon: string
  description: string | null
  status: 'active' | 'completed'
  pinned: boolean
  completed_at: string | null
  created_at: string
  motivation_nudge: string | null
  updated_at?: string
  deleted_at?: string | null
}

export type HabitValueType = 'count' | 'time' | 'boolean' | 'freeform'
export type HabitGoalPeriod = 'daily' | 'weekly'

export interface Habit {
  id: string
  user_id: string
  title: string
  description: string | null
  icon: string | null
  value_type: HabitValueType
  unit_label: string | null     // 'reps', 'min', 'glasses', etc. — null for boolean
  goal_value: number | null     // null = no goal
  goal_period: HabitGoalPeriod
  index: string
  is_archived: boolean
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

export interface HabitTracking {
  id: string
  habit_id: string
  user_id: string
  value: number                 // minutes for time; count otherwise; 1/0 for boolean
  logged_at: string
  period_date: string           // YYYY-MM-DD local date
  note: string | null
  updated_at?: string
  deleted_at?: string | null
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  all_day: boolean
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}
