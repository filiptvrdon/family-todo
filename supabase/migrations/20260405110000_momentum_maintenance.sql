-- Migration to add maintenance columns for momentum
alter table public.users add column if not exists last_momentum_decay timestamp with time zone default now();
alter table public.users add column if not exists last_momentum_nudge timestamp with time zone;

alter table public.quests add column if not exists last_momentum_decay timestamp with time zone default now();
alter table public.quests add column if not exists last_momentum_nudge timestamp with time zone;
alter table public.quests add column if not exists motivation_nudge text;

-- Improved process_daily_momentum function
create or replace function public.process_daily_momentum()
returns void as $$
begin
  -- 1. Apply decay to users who haven't had an increase in 24h AND haven't had a decay in 24h
  update public.users
  set momentum = greatest(0, momentum - greatest(1, floor(momentum * 0.01))),
      last_momentum_decay = now()
  where last_momentum_increase < now() - interval '24 hours'
    and last_momentum_decay < now() - interval '23 hours'
    and momentum > 0;

  -- 2. Apply decay to active quests
  update public.quests
  set momentum = greatest(0, momentum - greatest(1, floor(momentum * 0.01))),
      last_momentum_decay = now()
  where last_momentum_increase < now() - interval '24 hours'
    and last_momentum_decay < now() - interval '23 hours'
    and momentum > 0
    and status = 'active';

  -- 3. Update day_start_momentum for the new day tracking (visual only)
  -- This should only happen once a day near midnight, but we'll do it if it's been > 20h
  -- We'll use a new global setting or just base it on users' last decay?
  -- Actually, let's just do it whenever momentum is updated for a new day.
end;
$$ language plpgsql security definer;
