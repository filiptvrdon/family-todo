-- ============================================================
-- Family Todo — clean schema (vanilla PostgreSQL, no Supabase)
-- Derived from supabase/migrations/*; auth.users FK, RLS
-- policies, and Supabase-specific extensions removed.
-- avatar_url kept temporarily; replaced by avatar_data in Phase 4.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   text        NOT NULL UNIQUE,
  display_name            text        NOT NULL DEFAULT '',
  partner_id              uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  google_refresh_token    text,
  username                text,
  customization_prompt    text,
  avatar_url              text,       -- legacy; replaced by avatar_data in Phase 4
  avatar_data             bytea,      -- raw avatar bytes (Phase 4+)
  avatar_mime             text,       -- e.g. 'image/png'  (Phase 4+)
  momentum                integer     NOT NULL DEFAULT 0,
  last_momentum_increase  timestamptz NOT NULL DEFAULT now(),
  day_start_momentum      integer     NOT NULL DEFAULT 0,
  last_momentum_decay     timestamptz NOT NULL DEFAULT now(),
  last_momentum_nudge     timestamptz,
  password_hash           text,       -- bcrypt hash for Auth.js Credentials
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todos (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title                 text        NOT NULL,
  description           text,
  completed             boolean     NOT NULL DEFAULT false,
  priority              text        CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date              date,
  recurrence            text        CHECK (recurrence IN ('daily', 'weekly', 'monthly')),
  scheduled_time        time,
  parent_id             uuid        REFERENCES public.todos(id) ON DELETE CASCADE,
  index                 text        NOT NULL DEFAULT '',
  motivation_nudge      text,
  completion_nudge      text,
  energy_level          text        CHECK (energy_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  momentum_contribution integer     NOT NULL DEFAULT 0,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz NOT NULL,
  all_day     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quests (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                    text        NOT NULL,
  icon                    text        NOT NULL,
  description             text,
  status                  text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  pinned                  boolean     NOT NULL DEFAULT false,
  completed_at            timestamptz,
  momentum                integer     NOT NULL DEFAULT 0,
  last_momentum_increase  timestamptz NOT NULL DEFAULT now(),
  day_start_momentum      integer     NOT NULL DEFAULT 0,
  last_momentum_decay     timestamptz NOT NULL DEFAULT now(),
  last_momentum_nudge     timestamptz,
  motivation_nudge        text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quest_tasks (
  quest_id  uuid  NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  task_id   uuid  NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  PRIMARY KEY (quest_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.habits (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  icon         text,
  value_type   text        NOT NULL CHECK (value_type IN ('count', 'time', 'boolean', 'freeform')),
  unit_label   text,
  goal_value   integer,
  goal_period  text        NOT NULL DEFAULT 'daily' CHECK (goal_period IN ('daily', 'weekly')),
  index        text        NOT NULL DEFAULT '',
  is_archived  boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_tracking (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    uuid        NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value       integer     NOT NULL,
  logged_at   timestamptz NOT NULL DEFAULT now(),
  period_date date        NOT NULL,
  note        text
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_todos_user_id         ON public.todos (user_id);
CREATE INDEX IF NOT EXISTS idx_todos_parent_id        ON public.todos (parent_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user   ON public.calendar_events (user_id);
CREATE INDEX IF NOT EXISTS idx_quests_user_id         ON public.quests (user_id);
CREATE INDEX IF NOT EXISTS idx_habit_tracking_period  ON public.habit_tracking (habit_id, period_date);
CREATE INDEX IF NOT EXISTS idx_habits_user_index      ON public.habits (user_id, index);

-- ============================================================
-- Trigger: momentum on task completion / un-completion
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_todo_completion_momentum()
RETURNS trigger AS $$
BEGIN
  IF new.completed = true AND (old.completed = false OR old.completed IS NULL) THEN
    UPDATE public.users
    SET momentum             = momentum + new.momentum_contribution,
        last_momentum_increase = now()
    WHERE id = new.user_id;

    UPDATE public.quests
    SET momentum             = momentum + new.momentum_contribution,
        last_momentum_increase = now()
    WHERE id IN (
      SELECT quest_id FROM public.quest_tasks WHERE task_id = new.id
    );

  ELSIF new.completed = false AND old.completed = true THEN
    UPDATE public.users
    SET momentum = GREATEST(0, momentum - new.momentum_contribution)
    WHERE id = new.user_id;

    UPDATE public.quests
    SET momentum = GREATEST(0, momentum - new.momentum_contribution)
    WHERE id IN (
      SELECT quest_id FROM public.quest_tasks WHERE task_id = new.id
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_todo_completed_momentum ON public.todos;
CREATE TRIGGER on_todo_completed_momentum
  AFTER UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_todo_completion_momentum();

-- ============================================================
-- Function: daily momentum decay (called via API cron route)
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_daily_momentum()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET momentum            = GREATEST(0, momentum - GREATEST(1, FLOOR(momentum * 0.01)::integer)),
      last_momentum_decay = now()
  WHERE last_momentum_increase < now() - INTERVAL '24 hours'
    AND last_momentum_decay    < now() - INTERVAL '23 hours'
    AND momentum > 0;

  UPDATE public.quests
  SET momentum            = GREATEST(0, momentum - GREATEST(1, FLOOR(momentum * 0.01)::integer)),
      last_momentum_decay = now()
  WHERE last_momentum_increase < now() - INTERVAL '24 hours'
    AND last_momentum_decay    < now() - INTERVAL '23 hours'
    AND momentum > 0
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;
