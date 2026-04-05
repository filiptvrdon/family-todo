-- Fix infinite recursion in users RLS policies
-- The recursion was caused by the "Users can view partner user" policy querying the users table.

-- 1. Create a security definer function to get the partner_id safely
-- This function runs as the owner and bypasses RLS on the users table.
create or replace function public.get_my_partner_id()
returns uuid as $$
  select partner_id from public.users where id = auth.uid();
$$ language sql security definer set search_path = public stable;

-- 2. Drop the problematic recursive policy
drop policy if exists "Users can view partner user" on public.users;

-- 3. Re-create the policy using the security definer function
create policy "Users can view partner user" on public.users
  for select using (id = public.get_my_partner_id());

-- 4. Also update other tables to use the same function for consistency and performance
drop policy if exists "Users can view partner todos" on public.todos;
create policy "Users can view partner todos" on public.todos
  for select using (user_id = public.get_my_partner_id());

drop policy if exists "Users can view partner events" on public.calendar_events;
create policy "Users can view partner events" on public.calendar_events
  for select using (user_id = public.get_my_partner_id());

-- 5. Keep the "Authenticated users can view all users" policy as it might be needed for some features
-- but it won't cause recursion if we don't query the same table inside its USING clause.
-- Actually, if we have "Authenticated users can view all users", the above is still redundant but safe.
-- If the user wants true privacy, they should drop "Authenticated users can view all users".
