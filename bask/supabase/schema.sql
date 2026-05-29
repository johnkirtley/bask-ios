-- Bask Touch Grass Leaderboard — Supabase Schema
--
-- FIRST-TIME SETUP: Run this entire file in Supabase SQL Editor on a fresh project.
-- RECOVERY: If tables already exist, do NOT re-run this file — use fix-pgcrypto-search-path.sql
--           instead. See supabase/RECOVERY.md
--
-- Requires pgcrypto in the `extensions` schema (Supabase default).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ==========================================
-- Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS leaderboard_users (
  public_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_name TEXT NOT NULL,
  country_code TEXT,
  region_label TEXT,
  city_label TEXT,
  location_precision TEXT NOT NULL DEFAULT 'none'
    CHECK (location_precision IN ('none', 'country', 'region', 'city')),
  opted_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS leaderboard_user_secrets (
  public_user_id UUID PRIMARY KEY REFERENCES leaderboard_users(public_user_id) ON DELETE CASCADE,
  write_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Private raw events (no public SELECT)
CREATE TABLE IF NOT EXISTS leaderboard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_user_id UUID NOT NULL REFERENCES leaderboard_users(public_user_id) ON DELETE CASCADE,
  local_session_id TEXT NOT NULL,
  iu_gained INTEGER NOT NULL CHECK (iu_gained >= 0 AND iu_gained <= 50000),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 28800),
  country_code TEXT,
  region_label TEXT,
  city_label TEXT,
  session_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (public_user_id, local_session_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_sessions_user_date
  ON leaderboard_sessions(public_user_id, session_date);

CREATE INDEX IF NOT EXISTS idx_leaderboard_sessions_created
  ON leaderboard_sessions(created_at DESC);

-- Public aggregate rows (exposed via RPC only)
CREATE TABLE IF NOT EXISTS leaderboard_daily_stats (
  public_user_id UUID NOT NULL REFERENCES leaderboard_users(public_user_id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  total_iu INTEGER NOT NULL DEFAULT 0 CHECK (total_iu >= 0),
  total_sun_seconds INTEGER NOT NULL DEFAULT 0 CHECK (total_sun_seconds >= 0),
  session_count INTEGER NOT NULL DEFAULT 0 CHECK (session_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (public_user_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_daily_stats_date
  ON leaderboard_daily_stats(session_date DESC);

-- ==========================================
-- Helpers
-- ==========================================

CREATE OR REPLACE FUNCTION validate_anonymous_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := lower(trim(p_name));
  cleaned := regexp_replace(cleaned, '\s+', '-', 'g');
  cleaned := regexp_replace(cleaned, '[^a-z0-9-]', '', 'g');
  IF length(cleaned) < 3 OR length(cleaned) > 30 THEN
    RAISE EXCEPTION 'Name must be 3-30 characters';
  END IF;
  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION hash_write_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION verify_write_token(
  p_public_user_id UUID,
  p_write_token TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM leaderboard_user_secrets s
    WHERE s.public_user_id = p_public_user_id
      AND s.write_token_hash = hash_write_token(p_write_token)
  );
$$;

-- ==========================================
-- RPC: Register leaderboard user (opt-in)
-- Returns public_user_id and write_token (shown once to client)
-- ==========================================

CREATE OR REPLACE FUNCTION register_leaderboard_user(
  p_anonymous_name TEXT,
  p_country_code TEXT DEFAULT NULL,
  p_region_label TEXT DEFAULT NULL,
  p_city_label TEXT DEFAULT NULL,
  p_location_precision TEXT DEFAULT 'none'
)
RETURNS TABLE(public_user_id UUID, write_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_name TEXT;
BEGIN
  v_name := validate_anonymous_name(p_anonymous_name);
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_user_id := gen_random_uuid();

  BEGIN
    INSERT INTO leaderboard_users (
      public_user_id, anonymous_name, country_code, region_label,
      city_label, location_precision, opted_in_at, updated_at
    ) VALUES (
      v_user_id, v_name, NULLIF(trim(p_country_code), ''), NULLIF(trim(p_region_label), ''),
      NULLIF(trim(p_city_label), ''), COALESCE(p_location_precision, 'none'), now(), now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'anonymous_name_taken';
  END;

  INSERT INTO leaderboard_user_secrets (public_user_id, write_token_hash)
  VALUES (v_user_id, hash_write_token(v_token));

  RETURN QUERY SELECT v_user_id, v_token;
END;
$$;

-- ==========================================
-- RPC: Update profile (name / location)
-- ==========================================

CREATE OR REPLACE FUNCTION update_leaderboard_profile(
  p_public_user_id UUID,
  p_write_token TEXT,
  p_anonymous_name TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_region_label TEXT DEFAULT NULL,
  p_city_label TEXT DEFAULT NULL,
  p_location_precision TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NOT verify_write_token(p_public_user_id, p_write_token) THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  IF p_anonymous_name IS NOT NULL THEN
    v_name := validate_anonymous_name(p_anonymous_name);
    IF EXISTS (
      SELECT 1
      FROM leaderboard_users u
      WHERE u.anonymous_name = v_name
        AND u.public_user_id <> p_public_user_id
    ) THEN
      RAISE EXCEPTION 'anonymous_name_taken';
    END IF;
  END IF;

  UPDATE leaderboard_users
  SET
    anonymous_name = COALESCE(validate_anonymous_name(p_anonymous_name), anonymous_name),
    country_code = CASE WHEN p_country_code IS NOT NULL THEN NULLIF(trim(p_country_code), '') ELSE country_code END,
    region_label = CASE WHEN p_region_label IS NOT NULL THEN NULLIF(trim(p_region_label), '') ELSE region_label END,
    city_label = CASE WHEN p_city_label IS NOT NULL THEN NULLIF(trim(p_city_label), '') ELSE city_label END,
    location_precision = COALESCE(p_location_precision, location_precision),
    updated_at = now()
  WHERE public_user_id = p_public_user_id;
END;
$$;

-- ==========================================
-- RPC: Submit session (idempotent per local_session_id)
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

-- ==========================================
-- RPC: Pause / resume participation
-- ==========================================

CREATE OR REPLACE FUNCTION set_leaderboard_active(
  p_public_user_id UUID,
  p_write_token TEXT,
  p_is_active BOOLEAN
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

  UPDATE leaderboard_users
  SET is_active = p_is_active, updated_at = now()
  WHERE public_user_id = p_public_user_id;
END;
$$;

-- ==========================================
-- RPC: Delete all leaderboard data for a user
-- ==========================================

CREATE OR REPLACE FUNCTION delete_leaderboard_user(
  p_public_user_id UUID,
  p_write_token TEXT
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

  DELETE FROM leaderboard_users WHERE public_user_id = p_public_user_id;
END;
$$;

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE leaderboard_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_user_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_daily_stats ENABLE ROW LEVEL SECURITY;

-- No direct table access for anon/authenticated roles
DROP POLICY IF EXISTS "No direct read users" ON leaderboard_users;
CREATE POLICY "No direct read users" ON leaderboard_users FOR SELECT USING (false);
DROP POLICY IF EXISTS "No direct write users" ON leaderboard_users;
CREATE POLICY "No direct write users" ON leaderboard_users FOR ALL USING (false);

DROP POLICY IF EXISTS "No direct access secrets" ON leaderboard_user_secrets;
CREATE POLICY "No direct access secrets" ON leaderboard_user_secrets FOR ALL USING (false);

DROP POLICY IF EXISTS "No direct access sessions" ON leaderboard_sessions;
CREATE POLICY "No direct access sessions" ON leaderboard_sessions FOR ALL USING (false);

DROP POLICY IF EXISTS "No direct access daily stats" ON leaderboard_daily_stats;
CREATE POLICY "No direct access daily stats" ON leaderboard_daily_stats FOR ALL USING (false);

-- Grant RPC execute to anon (public leaderboard + app submissions via RPC)
GRANT EXECUTE ON FUNCTION register_leaderboard_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_leaderboard_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_leaderboard_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_leaderboard_active TO anon, authenticated;
