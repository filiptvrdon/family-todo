-- Helper function that bypasses RLS to get the current user's partner_id.
-- SECURITY DEFINER means it runs as the function owner (postgres), not the caller,
-- so it won't trigger the RLS policies on profiles and cause infinite recursion.
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT partner_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop and recreate the recursive policies
DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;
CREATE POLICY "Users can view partner profile" ON public.profiles
  FOR SELECT USING (id = public.get_my_partner_id());

DROP POLICY IF EXISTS "Users can view partner todos" ON public.todos;
CREATE POLICY "Users can view partner todos" ON public.todos
  FOR SELECT USING (user_id = public.get_my_partner_id());

DROP POLICY IF EXISTS "Users can view partner events" ON public.calendar_events;
CREATE POLICY "Users can view partner events" ON public.calendar_events
  FOR SELECT USING (user_id = public.get_my_partner_id());
