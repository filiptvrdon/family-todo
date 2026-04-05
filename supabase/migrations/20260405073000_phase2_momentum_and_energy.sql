-- Phase 2: Momentum & Energy
-- 1. Rename profiles to users
alter table if exists public.profiles rename to users;

-- 2. Add momentum to users
alter table public.users add column if not exists momentum integer default 0;
alter table public.users add column if not exists last_momentum_increase timestamp with time zone default now();
alter table public.users add column if not exists day_start_momentum integer default 0;

-- 3. Add momentum_contribution to todos
alter table public.todos add column if not exists momentum_contribution integer default 0;

-- 4. Add momentum and last_momentum_increase to quests
alter table public.quests add column if not exists momentum integer default 0;
alter table public.quests add column if not exists last_momentum_increase timestamp with time zone default now();
alter table public.quests add column if not exists day_start_momentum integer default 0;

-- 5. Trigger to handle momentum increase on task completion
create or replace function public.handle_todo_completion_momentum()
returns trigger as $$
begin
  if new.completed = true and (old.completed = false or old.completed is null) then
    -- Increase user momentum
    update public.users
    set momentum = momentum + new.momentum_contribution,
        last_momentum_increase = now()
    where id = new.user_id;

    -- Increase quest momentum for linked quests
    update public.quests
    set momentum = momentum + new.momentum_contribution,
        last_momentum_increase = now()
    where id in (
      select quest_id from public.quest_tasks where task_id = new.id
    );
  elsif new.completed = false and old.completed = true then
    -- Decrease user momentum (greatest 0 to prevent negative)
    update public.users
    set momentum = greatest(0, momentum - new.momentum_contribution)
    where id = new.user_id;

    -- Decrease quest momentum
    update public.quests
    set momentum = greatest(0, momentum - new.momentum_contribution)
    where id in (
      select quest_id from public.quest_tasks where task_id = new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_todo_completed_momentum on public.todos;
create trigger on_todo_completed_momentum
  after update on public.todos
  for each row
  execute procedure public.handle_todo_completion_momentum();

-- 6. Function to handle daily decay and trend tracking
-- This should be called once a day (e.g. at midnight)
create or replace function public.process_daily_momentum()
returns void as $$
begin
  -- 1. Apply decay to users who haven't had an increase in 24h
  update public.users
  set momentum = greatest(0, momentum - greatest(1, floor(momentum * 0.01)))
  where last_momentum_increase < now() - interval '24 hours'
    and momentum > 0;

  -- 2. Apply decay to quests
  update public.quests
  set momentum = greatest(0, momentum - greatest(1, floor(momentum * 0.01)))
  where last_momentum_increase < now() - interval '24 hours'
    and momentum > 0
    and status = 'active';

  -- 3. Update day_start_momentum for the new day
  update public.users set day_start_momentum = momentum;
  update public.quests set day_start_momentum = momentum;
end;
$$ language plpgsql security definer;
