-- Run this in your Supabase SQL editor to create the base schema
-- This schema reflects the state of the project as of 2026-04-05

-- 1. Users table (formerly profiles)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  username text,
  customization_prompt text,
  avatar_url text,
  partner_id uuid references public.users(id) on delete set null,
  google_refresh_token text,
  created_at timestamptz default now()
);

-- 2. Todos table
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  completed boolean default false,
  due_date date,
  recurrence text check (recurrence in ('daily', 'weekly', 'monthly')),
  scheduled_time text, -- HH:MM:SS format for daily scheduling
  parent_id uuid references public.todos(id) on delete cascade, -- for sub-tasks
  "index" text not null default '', -- fractional index for ordering
  motivation_nudge text,
  completion_nudge text,
  energy_level text check (energy_level in ('low', 'medium', 'high')) default 'medium',
  created_at timestamptz default now()
);

-- 3. Quests table
create table public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  icon text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed')),
  pinned boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 4. Quest_tasks join table
create table public.quest_tasks (
  quest_id uuid references public.quests(id) on delete cascade not null,
  task_id uuid references public.todos(id) on delete cascade not null,
  primary key (quest_id, task_id)
);

-- 5. Calendar events table
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean default false,
  created_at timestamptz default now()
);

-- 6. Enable Row Level Security
alter table public.users enable row level security;
alter table public.todos enable row level security;
alter table public.quests enable row level security;
alter table public.quest_tasks enable row level security;
alter table public.calendar_events enable row level security;

-- 7. RLS Policies

-- Users
create or replace function public.get_my_partner_id()
returns uuid as $$
  select partner_id from public.users where id = auth.uid();
$$ language sql security definer set search_path = public stable;

create policy "Users can view own user" on public.users for select using (auth.uid() = id);
create policy "Users can view partner user" on public.users for select using (id = public.get_my_partner_id());
create policy "Users can insert own user" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own user" on public.users for update using (auth.uid() = id);
create policy "Authenticated users can view all users" on public.users for select using (auth.role() = 'authenticated');

-- Todos
create policy "Users can view own todos" on public.todos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can view partner todos" on public.todos for select using (user_id = public.get_my_partner_id());

-- Quests
create policy "Users can manage own quests" on public.quests for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Quest_tasks
create policy "Users can manage quest_tasks for own quests" on public.quest_tasks for all using (quest_id in (select id from public.quests where user_id = auth.uid())) with check (quest_id in (select id from public.quests where user_id = auth.uid()));

-- Calendar events
create policy "Users can view own events" on public.calendar_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can view partner events" on public.calendar_events for select using (user_id = public.get_my_partner_id());

-- 8. Functions and Triggers

-- Auto-create user on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
