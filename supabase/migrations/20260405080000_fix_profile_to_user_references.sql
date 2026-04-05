-- Fix all references to profiles table (renamed to users)
-- 1. Update trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

-- 2. Update RLS policies on users table
-- We rename them to mention "user" instead of "profile"
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own user" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users can view partner profile" on public.users;
create policy "Users can view partner user" on public.users
  for select using (
    id in (
      select partner_id from public.users where id = auth.uid()
    )
  );

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own user" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own user" on public.users
  for update using (auth.uid() = id);

drop policy if exists "Authenticated users can view all profiles" on public.users;
create policy "Authenticated users can view all users" on public.users
  for select using (auth.role() = 'authenticated');

-- 3. Update RLS policies on other tables that reference profiles
-- todos
drop policy if exists "Users can view partner todos" on public.todos;
create policy "Users can view partner todos" on public.todos
  for select using (
    user_id in (
      select partner_id from public.users where id = auth.uid()
    )
  );

-- calendar_events
drop policy if exists "Users can view partner events" on public.calendar_events;
create policy "Users can view partner events" on public.calendar_events
  for select using (
    user_id in (
      select partner_id from public.users where id = auth.uid()
    )
  );
