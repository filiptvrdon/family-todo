-- Habits: blueprint definitions
CREATE TABLE habits (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  icon         text,                         -- emoji, e.g. '💧'
  value_type   text        NOT NULL CHECK (value_type IN ('count', 'time', 'boolean', 'freeform')),
  unit_label   text,                         -- display label: 'reps', 'min', 'glasses' — null for boolean
  goal_value   integer,                      -- target per period; null = no goal
  goal_period  text        NOT NULL DEFAULT 'daily' CHECK (goal_period IN ('daily', 'weekly')),
  index        text        NOT NULL DEFAULT '', -- fractional index for ordering
  is_archived  boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Habit tracking: one row per log session
CREATE TABLE habit_tracking (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    uuid        NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value       integer     NOT NULL,           -- minutes for 'time'; count for others; 1/0 for boolean
  logged_at   timestamptz NOT NULL DEFAULT now(),
  period_date date        NOT NULL,           -- user's local date (YYYY-MM-DD) for safe aggregations
  note        text                            -- optional per-session note
);

-- Indexes for common queries
CREATE INDEX habit_tracking_habit_period ON habit_tracking (habit_id, period_date);
CREATE INDEX habits_user_index ON habits (user_id, index);

-- RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_tracking ENABLE ROW LEVEL SECURITY;

-- habits: owner full CRUD, partner read-only
CREATE POLICY "habits_select" ON habits FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT partner_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "habits_insert" ON habits FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "habits_update" ON habits FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "habits_delete" ON habits FOR DELETE
  USING (user_id = auth.uid());

-- habit_tracking: same pattern
CREATE POLICY "habit_tracking_select" ON habit_tracking FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id = (SELECT partner_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "habit_tracking_insert" ON habit_tracking FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "habit_tracking_update" ON habit_tracking FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "habit_tracking_delete" ON habit_tracking FOR DELETE
  USING (user_id = auth.uid());
