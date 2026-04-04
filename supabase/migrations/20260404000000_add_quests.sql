-- quests table
create table public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  icon text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed')),
  pinned boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.quests enable row level security;

create policy "Users can manage own quests" on public.quests
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- quest_tasks join table (many-to-many between quests and todos)
create table public.quest_tasks (
  quest_id uuid references public.quests(id) on delete cascade not null,
  task_id uuid references public.todos(id) on delete cascade not null,
  primary key (quest_id, task_id)
);

alter table public.quest_tasks enable row level security;

create policy "Users can manage quest_tasks for own quests" on public.quest_tasks
  for all using (
    quest_id in (select id from public.quests where user_id = auth.uid())
  )
  with check (
    quest_id in (select id from public.quests where user_id = auth.uid())
  );
