create table public.sub_tasks (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid references public.todos(id) on delete cascade not null,
  title text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.sub_tasks enable row level security;

create policy "Users can view sub-tasks of own todos" on public.sub_tasks
  for select using (
    todo_id in (select id from public.todos where user_id = auth.uid())
  );

create policy "Users can view sub-tasks of partner todos" on public.sub_tasks
  for select using (
    todo_id in (
      select id from public.todos where user_id in (
        select partner_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "Users can insert sub-tasks on own todos" on public.sub_tasks
  for insert with check (
    todo_id in (select id from public.todos where user_id = auth.uid())
  );

create policy "Users can update sub-tasks on own todos" on public.sub_tasks
  for update using (
    todo_id in (select id from public.todos where user_id = auth.uid())
  );

create policy "Users can delete sub-tasks on own todos" on public.sub_tasks
  for delete using (
    todo_id in (select id from public.todos where user_id = auth.uid())
  );
