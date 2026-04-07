import { SupabaseClient } from '@supabase/supabase-js'
import { User } from '@/lib/types'

export async function fetchUser(
  supabase: SupabaseClient,
  userId: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function fetchPartner(
  supabase: SupabaseClient,
  partnerId: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', partnerId)
    .single()
  if (error) throw error
  return data
}

export async function updateUser(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<User>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
