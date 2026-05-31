-- Remove smoke-test and unrealistic demo leaderboard users.
-- Run in Supabase SQL Editor. Review the preview before DELETE.
-- See supabase/RECOVERY.md

-- 1) Preview rows that will be removed
SELECT
  u.public_user_id,
  u.anonymous_name,
  u.current_streak,
  u.longest_streak,
  u.opted_in_at
FROM leaderboard_users u
WHERE u.anonymous_name LIKE 'streak-demo-%'
   OR u.anonymous_name LIKE 'test-%'
   OR u.anonymous_name LIKE 'test-b-%'
   OR u.public_user_id IN (
     SELECT DISTINCT s.public_user_id
     FROM leaderboard_sessions s
     WHERE s.local_session_id LIKE 'seed-%'
        OR s.local_session_id LIKE 'smoke%'
   )
ORDER BY u.opted_in_at;

-- 2) Delete (CASCADE removes sessions, daily_stats, secrets)
-- Uncomment and run only after the preview looks correct.

/*
DELETE FROM leaderboard_users u
WHERE u.anonymous_name LIKE 'streak-demo-%'
   OR u.anonymous_name LIKE 'test-%'
   OR u.anonymous_name LIKE 'test-b-%'
   OR u.public_user_id IN (
     SELECT DISTINCT s.public_user_id
     FROM leaderboard_sessions s
     WHERE s.local_session_id LIKE 'seed-%'
        OR s.local_session_id LIKE 'smoke%'
   );
*/
