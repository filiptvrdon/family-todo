// Thin wrapper around Supabase auth.getUser() — will be replaced by Auth.js in Phase 3.
import { createClient } from '@/lib/supabase/server'

export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
