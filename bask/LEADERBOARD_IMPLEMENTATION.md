# Touch Grass Leaderboard — Implementation Guide

## Overview

Opt-in anonymous leaderboard where Bask uploads **per-session sun exposure events** (IU + duration, supplements excluded) to Supabase after each completed manual basking session. Raw events are **private**; the public marketing page reads **aggregate daily/weekly rankings** only.

---

## Architecture

```
Bask App (opt-in)
  └─ submit_leaderboard_session RPC  →  private leaderboard_sessions
                                     →  aggregate leaderboard_daily_stats

Marketing site (leaderboard.getbask.app)
  └─ get_leaderboard RPC  →  public aggregate rows only
```

**Key design choices:**
- Per-session ingestion keeps the leaderboard feeling live (updates after every session).
- Public reads use pre-aggregated daily stats — no raw session log exposure.
- Write token + hashed secret prevents spoofing with public UUID alone.
- Idempotency via `(public_user_id, local_session_id)`.
- Optional coarse location: country / region / city (user-selected, never GPS).

---

## Supabase Setup

### First-time setup

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor on a **fresh** project.

### Recovery (tables already exist)

If you see `relation "leaderboard_users" already exists`, **do not** re-run the full schema. See [`supabase/RECOVERY.md`](supabase/RECOVERY.md).

Common fix when register fails with `gen_random_bytes does not exist`:

1. Run [`supabase/fix-pgcrypto-search-path.sql`](supabase/fix-pgcrypto-search-path.sql) in SQL Editor.
2. Verify with `npm run test:leaderboard`.

### Env URL

Use the **Project URL** only (`https://YOUR_REF.supabase.co`). Do not append `/rest/v1`.

### Tables

| Table | Visibility | Purpose |
|-------|------------|---------|
| `leaderboard_users` | Private (RPC only) | Anonymous name, optional location labels |
| `leaderboard_user_secrets` | Private | SHA-256 hashed write tokens |
| `leaderboard_sessions` | Private | Raw per-session events |
| `leaderboard_daily_stats` | Private (RPC only) | Daily aggregates for ranking |

### RPCs

| RPC | Caller | Purpose |
|-----|--------|---------|
| `register_leaderboard_user` | App (opt-in) | Create user, return `public_user_id` + `write_token` once |
| `update_leaderboard_profile` | App | Update name / location |
| `submit_leaderboard_session` | App | Idempotent session ingest + aggregate update |
| `get_leaderboard` | Marketing site | Public daily/weekly rankings |
| `delete_leaderboard_user` | App | Cascade delete all leaderboard data |

### Anti-abuse

- Max 50,000 IU per session
- Max 100,000 IU per user per day
- Max 50 sessions per user per day
- Idempotent local session IDs
- No direct table writes (RLS blocks all; SECURITY DEFINER RPCs only)

---

## Environment Variables

Add to `.env` and `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Marketing site: copy `leaderboard-site/config.example.js` → `config.js`.

---

## App Files

### New

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Supabase client singleton |
| `lib/supabase/leaderboardService.ts` | Opt-in, sync, delete, fetch |
| `lib/leaderboard/anonymousNames.ts` | Nature-themed name generator |
| `lib/leaderboard/countries.ts` | Country list + location formatting |
| `hooks/useLeaderboard.ts` | React hook |
| `components/settings/LeaderboardSettings.tsx` | Settings UI |

### Modified

| File | Change |
|------|--------|
| `lib/constants.ts` | `LEADERBOARD_SETTINGS`, `LEADERBOARD_URL` |
| `hooks/useBaskSession.ts` | Fire-and-forget `submitSession` after session save |
| `app/settings/page.tsx` | Community section + privacy copy |
| `components/settings/ScienceFAQ.tsx` | "Private by default" FAQ |

### Local settings keys

- `leaderboard_opted_in`
- `leaderboard_public_user_id`
- `leaderboard_write_token`
- `leaderboard_anonymous_name`
- `leaderboard_country_code`
- `leaderboard_region_label`
- `leaderboard_city_label`
- `leaderboard_location_precision` (`none` \| `country` \| `region` \| `city`)
- `leaderboard_nudge_dismissed`

---

## Data Sent (Opt-In Only)

| Sent | Never sent |
|------|------------|
| Random public ID + write token | Apple ID, email, name |
| Anonymous display name | Precise GPS |
| IU + duration per completed session | Skin type, age, weight, blood tests |
| Optional country/region/city (if chosen) | Supplements, cofactors, HealthKit |

---

## Marketing Site

Static site in [`leaderboard-site/`](leaderboard-site/). Deploy to `leaderboard.getbask.app`.

Features:
- Today / This Week tabs
- Country filter
- Auto-refresh every 60s
- Reads `get_leaderboard` RPC only

---

## Verification Checklist

1. Run SQL setup (see [`supabase/RECOVERY.md`](supabase/RECOVERY.md) if tables already exist)
2. `npm run test:leaderboard` — all checks should pass
3. `npm run lint` && `npm run build`
4. Settings → Community → opt in
5. Complete a basking session → verify row in `leaderboard_sessions` (Supabase dashboard)
6. Call `get_leaderboard` → verify ranked aggregate
7. Opt out / delete → verify data removed
8. Airplane mode → session completes, sync fails silently

---

## Future (Not V1)

- Homepage rank card + one-time nudge
- Onboarding opt-in screen
- Outbox retry queue for failed uploads
