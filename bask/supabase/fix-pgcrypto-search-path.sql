-- Fix: pgcrypto lives in the `extensions` schema on Supabase.
-- Run this in SQL Editor if register_leaderboard_user fails with
-- "function gen_random_bytes(integer) does not exist" even when pgcrypto is enabled.
-- See supabase/RECOVERY.md for full recovery guide.

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

  INSERT INTO leaderboard_users (
    public_user_id, anonymous_name, country_code, region_label,
    city_label, location_precision, opted_in_at, updated_at
  ) VALUES (
    v_user_id, v_name, NULLIF(trim(p_country_code), ''), NULLIF(trim(p_region_label), ''),
    NULLIF(trim(p_city_label), ''), COALESCE(p_location_precision, 'none'), now(), now()
  );

  INSERT INTO leaderboard_user_secrets (public_user_id, write_token_hash)
  VALUES (v_user_id, hash_write_token(v_token));

  RETURN QUERY SELECT v_user_id, v_token;
END;
$$;

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
BEGIN
  IF NOT verify_write_token(p_public_user_id, p_write_token) THEN
    RAISE EXCEPTION 'Invalid credentials';
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

  IF p_local_session_id IS NULL OR length(trim(p_local_session_id)) = 0 THEN
    RAISE EXCEPTION 'Missing session id';
  END IF;

  IF p_iu_gained < 0 OR p_iu_gained > 50000 THEN
    RAISE EXCEPTION 'Invalid IU value';
  END IF;

  IF p_duration_seconds <= 0 OR p_duration_seconds > 28800 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM leaderboard_sessions
    WHERE public_user_id = p_public_user_id
      AND local_session_id = trim(p_local_session_id)
  ) THEN
    RETURN;
  END IF;

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
