-- Run this in your Supabase SQL editor

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  partner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Todos table
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  completed boolean default false,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  due_date date,
  created_at timestamptz default now()
);

-- Calendar events table
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.todos enable row level security;
alter table public.calendar_events enable row level security;

-- Profiles policies: users can see their own profile and their partner's
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can view partner profile" on public.profiles
  for select using (
    id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Todos policies: users can see their own todos and their partner's
create policy "Users can view own todos" on public.todos
  for select using (auth.uid() = user_id);

create policy "Users can view partner todos" on public.todos
  for select using (
    user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

create policy "Users can insert own todos" on public.todos
  for insert with check (auth.uid() = user_id);

create policy "Users can update own todos" on public.todos
  for update using (auth.uid() = user_id);

create policy "Users can delete own todos" on public.todos
  for delete using (auth.uid() = user_id);

-- Calendar events policies (same pattern)
create policy "Users can view own events" on public.calendar_events
  for select using (auth.uid() = user_id);

create policy "Users can view partner events" on public.calendar_events
  for select using (
    user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

create policy "Users can insert own events" on public.calendar_events
  for insert with check (auth.uid() = user_id);

create policy "Users can update own events" on public.calendar_events
  for update using (auth.uid() = user_id);

create policy "Users can delete own events" on public.calendar_events
  for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
