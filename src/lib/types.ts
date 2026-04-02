export interface Profile {
  id: string
  email: string
  display_name: string
  username: string | null
  customization_prompt: string | null
  avatar_url: string | null
  partner_id: string | null
  google_refresh_token: string | null
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
  created_at: string
}

export interface SubTask {
  id: string
  todo_id: string
  title: string
  completed: boolean
  created_at: string
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
}
