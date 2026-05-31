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
| **Remove unrealistic demo users** | [`cleanup-demo-leaderboard.sql`](cleanup-demo-leaderboard.sql) |
| **Populate board at launch** | `npm run seed:leaderboard` from `bask/` |

## Demo data cleanup

If the board has `streak-demo-*` users or smoke-test leftovers from `test-leaderboard.mjs --seed`:

1. Open Supabase **SQL Editor**.
2. Run the **preview** query in [`cleanup-demo-leaderboard.sql`](cleanup-demo-leaderboard.sql).
3. Confirm only demo/test rows are listed (no real `gentle-dolphin`-style opt-ins).
4. Uncomment and run the **DELETE** block in the same file.

## Bootstrap seed (realistic early community)

After cleanup, from `bask/`:

```bash
npm run seed:leaderboard              # default ~22 users
npm run seed:leaderboard -- --count=25
npm run seed:leaderboard -- --dry-run # preview only
npm run seed:leaderboard -- --wipe-bootstrap  # remove prior bootstrap rows (uses local manifest)
```

Bootstrap users use adjective-animal names, streaks capped at 4 days, and session IDs prefixed `lb-bootstrap-`. Write tokens are stored in `scripts/.leaderboard-bootstrap-manifest.json` (gitignored) so `--wipe-bootstrap` can delete them without SQL.

To wipe bootstrap users without the manifest:

```sql
DELETE FROM leaderboard_users
WHERE public_user_id IN (
  SELECT DISTINCT public_user_id FROM leaderboard_sessions
  WHERE local_session_id LIKE 'lb-bootstrap-%'
);
```

Do **not** use `test-leaderboard.mjs --seed` on production (deprecated; redirects to `seed:leaderboard`).

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
   npm run test:leaderboard
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
