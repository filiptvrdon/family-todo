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
  password_hash           text,       -- bcrypt hash for Auth.js Credentials
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
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
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
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
  motivation_nudge        text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
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
