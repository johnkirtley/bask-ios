-- Allow zero-IU sessions to be recorded (e.g. low-UV basking that produces 0 IU).
-- Sessions still count toward session_count and sun_minutes; IU ranking is unaffected.
-- Run in Supabase SQL Editor on existing projects (after schema.sql / leaderboard-pause.sql).
-- See supabase/RECOVERY.md

-- Relax the table CHECK so 0 IU is valid (was: iu_gained > 0).
ALTER TABLE leaderboard_sessions
  DROP CONSTRAINT IF EXISTS leaderboard_sessions_iu_gained_check;
ALTER TABLE leaderboard_sessions
  ADD CONSTRAINT leaderboard_sessions_iu_gained_check
  CHECK (iu_gained >= 0 AND iu_gained <= 50000);

-- ==========================================
-- RPC: Submit session (idempotent per local_session_id)
-- Relaxed IU guard: allow 0, reject only negative / over-cap.
-- ==========================================

CREATE OR REPLACE FUNCTION submit_leaderboard_session(
  p_public_user_id UUID,
  p_write_token TEXT,
  p_local_session_id TEXT,
  p_iu_gained INTEGER,
  p_duration_seconds INTEGER,
  p_country_code TEXT DEFAULT NULL,
  p_region_label TEXT DEFAULT NULL,
  p_city_label TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session_date DATE := CURRENT_DATE;
  v_daily_iu INTEGER;
  v_session_count INTEGER;
BEGIN
  IF NOT verify_write_token(p_public_user_id, p_write_token) THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  IF NOT (SELECT is_active FROM leaderboard_users WHERE public_user_id = p_public_user_id) THEN
    RAISE EXCEPTION 'Leaderboard participation paused';
  END IF;

  IF p_local_session_id IS NULL OR length(trim(p_local_session_id)) = 0 THEN
    RAISE EXCEPTION 'Missing session id';
  END IF;

  IF p_iu_gained < 0 OR p_iu_gained > 50000 THEN
    RAISE EXCEPTION 'Invalid IU value';
  END IF;

  IF p_duration_seconds <= 0 OR p_duration_seconds > 28800 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  -- Idempotent: skip if already submitted
  IF EXISTS (
    SELECT 1 FROM leaderboard_sessions
    WHERE public_user_id = p_public_user_id
      AND local_session_id = trim(p_local_session_id)
  ) THEN
    RETURN;
  END IF;

  -- Daily caps
  SELECT COALESCE(SUM(iu_gained), 0), COUNT(*)
  INTO v_daily_iu, v_session_count
  FROM leaderboard_sessions
  WHERE public_user_id = p_public_user_id
    AND session_date = v_session_date;

  IF v_daily_iu + p_iu_gained > 100000 THEN
    RAISE EXCEPTION 'Daily IU cap exceeded';
  END IF;

  IF v_session_count >= 50 THEN
    RAISE EXCEPTION 'Daily session cap exceeded';
  END IF;

  INSERT INTO leaderboard_sessions (
    public_user_id, local_session_id, iu_gained, duration_seconds,
    country_code, region_label, city_label, session_date
  ) VALUES (
    p_public_user_id, trim(p_local_session_id), p_iu_gained, p_duration_seconds,
    NULLIF(trim(p_country_code), ''), NULLIF(trim(p_region_label), ''),
    NULLIF(trim(p_city_label), ''), v_session_date
  );

  INSERT INTO leaderboard_daily_stats (
    public_user_id, session_date, total_iu, total_sun_seconds, session_count, updated_at
  ) VALUES (
    p_public_user_id, v_session_date, p_iu_gained, p_duration_seconds, 1, now()
  )
  ON CONFLICT (public_user_id, session_date)
  DO UPDATE SET
    total_iu = leaderboard_daily_stats.total_iu + EXCLUDED.total_iu,
    total_sun_seconds = leaderboard_daily_stats.total_sun_seconds + EXCLUDED.total_sun_seconds,
    session_count = leaderboard_daily_stats.session_count + 1,
    updated_at = now();

  UPDATE leaderboard_users
  SET updated_at = now()
  WHERE public_user_id = p_public_user_id;
END;
$$;

-- ==========================================
-- RPC: Public leaderboard (aggregate only)
-- Include anyone who logged session time, not just users with IU > 0.
-- (IU ranking is being phased out in favor of streak length.)
-- ==========================================

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_start DATE,
  p_end DATE,
  p_limit INTEGER DEFAULT 50,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  anonymous_name TEXT,
  country_code TEXT,
  region_label TEXT,
  city_label TEXT,
  location_precision TEXT,
  total_iu BIGINT,
  total_sun_minutes BIGINT,
  session_count BIGINT,
  last_updated_at TIMESTAMPTZ,
  rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH aggregated AS (
    SELECT
      d.public_user_id,
      SUM(d.total_iu) AS total_iu,
      SUM(d.total_sun_seconds) AS total_sun_seconds,
      SUM(d.session_count) AS session_count,
      MAX(d.updated_at) AS last_updated_at
    FROM leaderboard_daily_stats d
    JOIN leaderboard_users u ON u.public_user_id = d.public_user_id
    WHERE u.is_active = true
      AND d.session_date >= p_start
      AND d.session_date < p_end
      AND (p_country_code IS NULL OR u.country_code = p_country_code)
    GROUP BY d.public_user_id
    HAVING SUM(d.total_sun_seconds) > 0
  )
  SELECT
    u.anonymous_name,
    CASE WHEN u.location_precision IN ('country', 'region', 'city') THEN u.country_code ELSE NULL END AS country_code,
    CASE WHEN u.location_precision IN ('region', 'city') THEN u.region_label ELSE NULL END AS region_label,
    CASE WHEN u.location_precision = 'city' THEN u.city_label ELSE NULL END AS city_label,
    u.location_precision,
    a.total_iu,
    (a.total_sun_seconds / 60)::BIGINT AS total_sun_minutes,
    a.session_count,
    a.last_updated_at,
    ROW_NUMBER() OVER (ORDER BY a.total_iu DESC, a.last_updated_at ASC) AS rank
  FROM aggregated a
  JOIN leaderboard_users u ON u.public_user_id = a.public_user_id
  ORDER BY a.total_iu DESC, a.last_updated_at ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
