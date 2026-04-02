-- Backfill sub_tasks that have index = '' with proper fractional index values.
-- Assigns 'a0', 'a1', 'a2', ... ordered by created_at within each todo.
update public.sub_tasks
set "index" = sub.new_index
from (
  select
    id,
    'a' || (row_number() over (partition by todo_id order by created_at) - 1)::text as new_index
  from public.sub_tasks
  where "index" = ''
) sub
where public.sub_tasks.id = sub.id;
