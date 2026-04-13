-- Fix updated_at trigger to only auto-set the timestamp when the caller didn't
-- explicitly change it. This preserves client-provided updated_at values during
-- sync (POST /api/sync), enabling correct last-write-wins conflict resolution.
--
-- Before: every UPDATE overwrote updated_at = NOW() regardless.
-- After: if the UPDATE explicitly changes updated_at (OLD != NEW), keep the new
--        value; otherwise auto-set to NOW() as before.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
