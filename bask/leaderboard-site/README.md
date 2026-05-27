# Touch Grass Leaderboard Site

Static marketing leaderboard for `leaderboard.getbask.app`.

## Setup

1. Run the Supabase schema in [`../supabase/schema.sql`](../supabase/schema.sql).
2. Copy `config.example.js` to `config.js` and add your Supabase URL + anon key.
3. Deploy this folder to any static host (Cloudflare Pages, Vercel, Netlify).

## Local preview

```bash
npx serve .
```

Open http://localhost:3000

## Data flow

- Bask app submits per-session events via `submit_leaderboard_session` RPC (opt-in only).
- This page reads aggregate rankings via `get_leaderboard` RPC only.
- Raw session rows are not publicly readable.
