# Supabase Setup

This project uses Supabase for production anonymous auth, saved characters, multiplayer rooms, battle state, turn actions, logs, rewards, and Realtime updates.

Official docs:

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Anonymous auth](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes)

## 1. Create Project

Create a Supabase project and keep these values:

```text
Project URL
Anon public key
```

They become:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 2. Enable Anonymous Auth

In Supabase Dashboard:

1. Go to Authentication.
2. Open Providers.
3. Enable Anonymous sign-ins.
4. Save.

Anonymous users are still authenticated users for RLS policies, so policies can use `auth.uid()`.

## 3. Run Migration

Apply:

```text
supabase/migrations/202605100001_battle_mvp.sql
```

Options:

- Supabase Dashboard: SQL Editor -> paste the migration -> Run.
- Supabase CLI: link the project, then run `supabase db push`.

The migration creates:

- `characters`
- `rooms`
- `room_participants`
- `turn_actions`
- `battle_logs`

It also enables RLS, adds owner/party policies, creates indexes, and adds multiplayer tables to `supabase_realtime`.

## 4. Confirm Realtime

The migration attempts to add these tables to the `supabase_realtime` publication:

- `rooms`
- `room_participants`
- `turn_actions`
- `battle_logs`

If a manual check is needed, use Supabase Dashboard -> Database -> Publications -> `supabase_realtime`.

## 5. Local Development Env

Create `.env.local`:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Then run:

```bash
npm run dev
```

If these env vars are missing on localhost, the app intentionally falls back to localStorage so UI work and tests can continue.

## 6. Netlify Env

In Netlify:

1. Open Site configuration.
2. Go to Environment variables.
3. Add `VITE_SUPABASE_URL`.
4. Add `VITE_SUPABASE_ANON_KEY`.
5. Redeploy.

Build settings:

```text
Build command: npm run build
Publish directory: dist
Node version: 20
```

`netlify.toml` already contains the build command, publish directory, Node version, and SPA redirect.

## 7. Browser QA With Two Anonymous Sessions

Use query-string session names to isolate Supabase auth storage in one browser:

```text
http://localhost:5173/?session=host
http://localhost:5173/?session=guest
```

Expected flow:

1. Host creates/selects a character.
2. Host creates a battle room.
3. Guest creates/selects a character.
4. Guest joins the room code.
5. Host starts battle.
6. Both commit actions.
7. Enemy HP and party HP update in both sessions.
8. Victory or failure reward can be claimed once.
9. Refresh keeps character XP/items.

## Troubleshooting

- Blank production app: confirm Netlify env vars are set and redeploy after setting them.
- Auth error: confirm anonymous sign-ins are enabled.
- Room not found on join: confirm the host room is still in lobby or the joining user has access.
- Realtime does not update: confirm tables are in `supabase_realtime`; polling still syncs every 2.5 seconds as a fallback.
- RLS error: rerun the migration and confirm `auth.uid()` policies exist.

