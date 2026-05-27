-- Enforce globally unique leaderboard anonymous names.
-- Run in Supabase SQL Editor on existing projects (after schema.sql / fix-pgcrypto).
-- See supabase/RECOVERY.md

-- Resolve any existing duplicates before adding the constraint (keeps earliest opt-in)
WITH ranked AS (
  SELECT
    public_user_id,
    anonymous_name,
    ROW_NUMBER() OVER (PARTITION BY anonymous_name ORDER BY opted_in_at, public_user_id) AS rn
  FROM leaderboard_users
)
UPDATE leaderboard_users u
SET anonymous_name = r.anonymous_name || '-' || substr(replace(u.public_user_id::text, '-', ''), 1, 4)
FROM ranked r
WHERE u.public_user_id = r.public_user_id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_users_anonymous_name
  ON leaderboard_users (anonymous_name);

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
