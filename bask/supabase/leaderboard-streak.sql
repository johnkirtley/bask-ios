-- Leaderboard streak: store each user's current + longest streak so the website
-- can rank by streak length instead of total IU.
-- Run in Supabase SQL Editor on existing projects (after schema.sql). Idempotent.
-- See supabase/RECOVERY.md

ALTER TABLE leaderboard_users
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;

-- ==========================================
-- RPC: Update streak (current + longest)
-- ==========================================

CREATE OR REPLACE FUNCTION update_leaderboard_streak(
  p_public_user_id UUID,
  p_write_token TEXT,
  p_current_streak INTEGER,
  p_longest_streak INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT verify_write_token(p_public_user_id, p_write_token) THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  IF p_current_streak < 0 OR p_current_streak > 100000
     OR p_longest_streak < 0 OR p_longest_streak > 100000 THEN
    RAISE EXCEPTION 'Invalid streak value';
  END IF;

  UPDATE leaderboard_users
  SET
    current_streak = p_current_streak,
    longest_streak = GREATEST(longest_streak, p_longest_streak),
    updated_at = now()
  WHERE public_user_id = p_public_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_leaderboard_streak TO anon, authenticated;
