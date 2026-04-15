import { useMemo } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { useTodoStore } from '@/stores/todo-store'

export interface AchievementSummary {
  low: number
  medium: number
  high: number
  total: number
}

export function useDailyAchievementSummary(userId: string, date: Date = new Date()) {
  const myTodos = useTodoStore(s => s.myTodos)
  const partnerTodos = useTodoStore(s => s.partnerTodos)
  
  return useMemo(() => {
    const allTodos = [...myTodos, ...partnerTodos]
    const completedToday = allTodos.filter(t => 
      t.completed && 
      t.completed_at && 
      isSameDay(parseISO(t.completed_at), date) &&
      t.user_id === userId
    )
    
    return {
      low: completedToday.filter(t => t.energy_level === 'low').length,
      medium: completedToday.filter(t => t.energy_level === 'medium').length,
      high: completedToday.filter(t => t.energy_level === 'high').length,
      total: completedToday.length
    } as AchievementSummary
  }, [myTodos, partnerTodos, userId, date])
}
