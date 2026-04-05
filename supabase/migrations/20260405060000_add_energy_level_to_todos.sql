alter table public.todos
  add column energy_level text check (energy_level in ('low', 'medium', 'high')) default 'low';
