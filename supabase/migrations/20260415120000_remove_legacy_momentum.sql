-- Migration to remove legacy momentum logic as per Spec 012 Rework
-- This replaces the point-based decay system with an achievement summary approach.

-- 1. Remove triggers
DROP TRIGGER on_todo_completed_momentum ON public.todos RESTRICT;

-- 2. Remove functions
DROP FUNCTION public.handle_todo_completion_momentum() RESTRICT;
DROP FUNCTION public.process_daily_momentum() RESTRICT;

-- 3. Remove columns from public.users
ALTER TABLE public.users DROP COLUMN momentum RESTRICT;
ALTER TABLE public.users DROP COLUMN last_momentum_increase RESTRICT;
ALTER TABLE public.users DROP COLUMN day_start_momentum RESTRICT;
ALTER TABLE public.users DROP COLUMN last_momentum_decay RESTRICT;
ALTER TABLE public.users DROP COLUMN last_momentum_nudge RESTRICT;

-- 4. Remove columns from public.todos
ALTER TABLE public.todos DROP COLUMN momentum_contribution RESTRICT;

-- 5. Remove columns from public.quests
ALTER TABLE public.quests DROP COLUMN momentum RESTRICT;
ALTER TABLE public.quests DROP COLUMN last_momentum_increase RESTRICT;
ALTER TABLE public.quests DROP COLUMN day_start_momentum RESTRICT;
ALTER TABLE public.quests DROP COLUMN last_momentum_decay RESTRICT;
ALTER TABLE public.quests DROP COLUMN last_momentum_nudge RESTRICT;
ALTER TABLE public.quests DROP COLUMN motivation_nudge RESTRICT;
