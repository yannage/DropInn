# DropInn Next Steps

## V1 Battle MVP Checklist

- [x] Add pure battle engine for Strike, Heavy, Guard, and Aid.
- [x] Replace tavern/social room view with battle-first UI.
- [x] Add shared enemy HP, party HP, downed state, and win/fail states.
- [x] Add XP/item reward application with level thresholds.
- [x] Add Supabase client, anonymous auth bootstrap, and session namespacing.
- [x] Add Supabase schema migration with RLS, indexes, and Realtime publication.
- [x] Replace Netlify Blob room endpoint with Supabase/local repository path.
- [x] Add Vitest coverage for battle mechanics, rewards, progression, and duplicate commits.
- [ ] Run Supabase migration in the target project.
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify.
- [ ] Browser QA with two Supabase-backed anonymous sessions.
- [ ] Netlify deployment QA with the production Supabase project.

## Supabase Setup

- [ ] Create a Supabase project.
- [ ] Enable anonymous sign-ins in Supabase Auth.
- [ ] Apply `supabase/migrations/202605100001_battle_mvp.sql`.
- [ ] Confirm Realtime is enabled for `rooms`, `room_participants`, `turn_actions`, and `battle_logs`.
- [ ] Add local `.env.local` for development.
- [ ] Add the same env vars in Netlify Site settings.

See `SUPABASE_SETUP.md` for exact steps.

## QA Flow

Test locally first:

- [ ] Start dev or preview server.
- [ ] Open `/?session=host`.
- [ ] Create/select a host character.
- [ ] Create a battle room.
- [ ] Open `/?session=guest`.
- [ ] Create/select a guest character.
- [ ] Join the host room code.
- [ ] Host starts battle.
- [ ] Both players commit actions.
- [ ] Verify enemy HP changes.
- [ ] Verify player HP changes after enemy attacks.
- [ ] Continue rounds until victory.
- [ ] Claim reward.
- [ ] Refresh and verify XP/item persisted.

Deployment QA:

- [ ] Netlify build succeeds with `npm run build`.
- [ ] Deployed app is not blank and has no framework overlay.
- [ ] Anonymous auth succeeds.
- [ ] Room creation writes to Supabase.
- [ ] Realtime updates propagate between two sessions.
- [ ] Refresh restores selected character and active room.

## Remaining Polish

- [ ] Add stronger damage/heal burst animation timing.
- [ ] Add low-HP pulsing state on party cards.
- [ ] Add a battle result recap modal after claim.
- [ ] Add mobile viewport pass at 390x844 and 430x932.
- [ ] Add empty/error states for missing Supabase env vars in production.
- [ ] Add a manual "copy room code" button.

## Post-V1 Backlog

- [ ] Account upgrade from anonymous auth.
- [ ] Server-side turn resolver using Supabase Edge Functions or a protected API.
- [ ] More enemy templates.
- [ ] Encounter selection from the lobby.
- [ ] Public/private room visibility.
- [ ] Tactical movement or lane positioning.
- [ ] LLM narration constrained by battle result JSON.

