alter table public.profiles
  add column if not exists username text,
  add column if not exists customization_prompt text;
