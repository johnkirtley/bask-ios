# Supabase Leaderboard Recovery

Use this guide when setup partially succeeded or re-running the full schema fails.

## Symptoms

| Error | Meaning |
|-------|---------|
| `relation "leaderboard_users" already exists` | Tables were created on a previous run. Do **not** re-run full `schema.sql`. |
| `function gen_random_bytes(integer) does not exist` | `pgcrypto` is enabled in the `extensions` schema, but functions still use `search_path=public` only. |
| `Invalid path specified in request URL` | `.env` uses Data API URL with `/rest/v1`. Use project base URL only. |

## Which file to run

| Situation | Run this |
|-----------|----------|
| **Fresh project** (no leaderboard tables yet) | [`schema.sql`](schema.sql) |
| **Tables already exist** + register RPC fails | [`fix-pgcrypto-search-path.sql`](fix-pgcrypto-search-path.sql) |
| **Enforce unique anonymous names** (existing project) | [`unique-anonymous-name.sql`](unique-anonymous-name.sql) |
| **Add pause/opt-out support** (existing project) | [`leaderboard-pause.sql`](leaderboard-pause.sql) |
| **Tables exist** + functions already patched | Nothing — run smoke test only |

## Recovery steps (your current situation)

1. **Do not** re-run [`schema.sql`](schema.sql) if tables already exist.
2. Open Supabase **SQL Editor**.
3. Paste and run the entire contents of [`fix-pgcrypto-search-path.sql`](fix-pgcrypto-search-path.sql).
4. Confirm `.env` uses:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
   ```
   (no `/rest/v1` suffix)
5. Run smoke test from `bask/`:
   ```bash
   node scripts/test-leaderboard.mjs
   ```

## Expected smoke test output

```
✅ get_leaderboard works
✅ register_leaderboard_user works
✅ submit_leaderboard_session works
✅ Leaderboard shows test user at rank #1
✅ Idempotency works
✅ set_leaderboard_active works (pause / reactivate)
✅ delete_leaderboard_user works
```

## Verify functions (optional)

In SQL Editor:

```sql
SELECT proname, proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'register_leaderboard_user',
    'submit_leaderboard_session',
    'hash_write_token'
  );
```

Each function should include `search_path=public, extensions` in `proconfig`.

## CLI alternative (if project is linked)

```bash
npx supabase db query --linked -f supabase/fix-pgcrypto-search-path.sql
```

Requires `supabase login` and `supabase link --project-ref YOUR_REF`.

## Nuclear reset (dev only)

Only if you want to wipe all leaderboard data and start over:

```sql
DROP TABLE IF EXISTS leaderboard_daily_stats CASCADE;
DROP TABLE IF EXISTS leaderboard_sessions CASCADE;
DROP TABLE IF EXISTS leaderboard_user_secrets CASCADE;
DROP TABLE IF EXISTS leaderboard_users CASCADE;
DROP FUNCTION IF EXISTS get_leaderboard(date, date, integer, text);
DROP FUNCTION IF EXISTS submit_leaderboard_session(uuid, text, text, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS register_leaderboard_user(text, text, text, text, text);
DROP FUNCTION IF EXISTS update_leaderboard_profile(uuid, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS delete_leaderboard_user(uuid, text);
DROP FUNCTION IF EXISTS set_leaderboard_active(uuid, text, boolean);
DROP FUNCTION IF EXISTS verify_write_token(uuid, text);
DROP FUNCTION IF EXISTS hash_write_token(text);
DROP FUNCTION IF EXISTS validate_anonymous_name(text);
```

Then run [`schema.sql`](schema.sql) from scratch.
