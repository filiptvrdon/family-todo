export interface Profile {
  id: string
  email: string
  display_name: string
  partner_id: string | null
}

export interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  due_date: string | null
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
