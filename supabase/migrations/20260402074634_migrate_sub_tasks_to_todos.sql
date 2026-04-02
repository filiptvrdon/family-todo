-- Step 1: Add parent_id and index columns to todos
alter table public.todos
  add column parent_id uuid references public.todos(id) on delete cascade,
  add column index text not null default '';

-- Step 2: Migrate existing sub_tasks rows into todos
insert into public.todos (id, user_id, title, completed, index, parent_id, created_at)
select
  st.id,
  t.user_id,
  st.title,
  st.completed,
  st.index,
  st.todo_id,
  st.created_at
from public.sub_tasks st
join public.todos t on t.id = st.todo_id;

-- Step 3: Drop sub_tasks table (RLS policies drop automatically)
drop table public.sub_tasks;
