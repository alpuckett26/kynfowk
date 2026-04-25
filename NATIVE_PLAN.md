# Kynfowk Native — Plan

Companion native app for iOS + Android. Reuses the existing Supabase
backend (auth, DB, edge functions, API routes). Standalone client UI
written in React Native via Expo.

## Decisions

- **Architecture:** **separate repo** (e.g. `kynfowk-mobile`).
  Keeps this Next.js repo unchanged, no monorepo restructure, no risk
  to production web. Both apps point at the same Supabase project.
- **Framework:** Expo (SDK latest stable at start time).
- **Routing:** `expo-router` (file-based — mirrors Next.js mental model).
- **State / Data:** `@supabase/supabase-js` directly. Optional later:
  TanStack Query for caching.
- **Auth:** Supabase magic-link first. Phone OTP later only if needed.
- **Calls:** Defer LiveKit / video integration past v1. v1 is non-call
  surfaces.
- **Push:** Use Expo's `expo-notifications` integrated with FCM/APNs.
  The web app already has push wired via `web-push`; that doesn't
  carry over — native uses different channels. Build later.
- **Capacitor:** Considered. Skipped — going native-native for genuine
  app-store presence and proper native UX patterns.

## What we are NOT building

- Don't try to share UI code between web (React DOM) and native
  (React Native). Different primitives. Reference the web screens
  visually, retype them in RN components.
- Don't convert this Next.js repo into a monorepo. Kept tripping over
  workspace-package + Metro resolution issues.
- Don't pull web's lib/ into native via babel-plugin-module-resolver.
  Was the proven cause of mysterious native crashes in the last
  attempt. Use standard package.json `dependencies` if anything is
  shared, and only via published packages or git deps.

## Schema reference (live DB, do not modify from native)

These are the real tables in production Supabase. **Always query
these, not the older `families` / `family_members` / `calls` names
that appear in this repo's stale `supabase/migrations/`.**

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (= auth.uid), `email`, `full_name`, `timezone` | One per signed-in user |
| `family_circles` | `id`, `name`, `created_by` | Web calls these "families" |
| `family_memberships` | `id`, `family_circle_id`, `user_id` (nullable), `display_name`, `invite_email`, `phone_number`, `relationship_label`, `role`, `status`, `is_placeholder`, `is_deceased`, `blocked_at` | One row per person. `user_id` null = invited but not signed up yet |
| `call_sessions` | `id`, `family_circle_id`, `created_by`, `title`, `scheduled_start`, `scheduled_end`, `actual_started_at`, `actual_ended_at`, `actual_duration_minutes`, `status`, `meeting_provider`, `meeting_url`, `reminder_status` | "calls" in the UI |
| `call_participants` | `id`, `call_session_id`, `membership_id`, `attended` | Who was invited / showed up |
| `call_attendance_events` | `call_session_id`, `membership_id`, `joined_at`, `left_at` | When each person joined/left |
| `call_recaps` | `call_session_id`, `created_by`, `summary`, `highlight`, `next_step` | Post-call notes |
| `availability_windows` | `family_circle_id`, `membership_id`, `weekday`, `start_hour`, `end_hour` | Per-person open windows |
| `family_activity` | `family_circle_id`, `actor_membership_id`, `activity_type`, `summary`, `metadata` | Activity feed |
| `family_polls` + `family_poll_responses` | | Polls feature |
| `circle_carousel_photos` | `family_circle_id`, `membership_id`, `photo_url`, `caption` | Photo reel |
| `game_catalog` + `game_sessions` | | Games (trivia, word chain) |
| `notifications` + `notification_preferences` + `notification_deliveries` | | Notification system |

Helper SQL functions to know about: `current_family_id()`,
`get_my_family_circle_ids()`, `is_family_member(uuid)`. RLS uses
these to scope reads.

## v1 scope (target: ~1 week of focused work)

1. Sign in via Supabase magic link (email)
2. Resolve current `auth.uid()` → `family_memberships` row → `family_circle_id`
3. Home screen: family circle name + upcoming `call_sessions` list
   (where `family_circle_id = current` AND `scheduled_start >= now`)
4. Tap a call → detail screen (title, when, participants from
   `call_participants` joined to `family_memberships`)
5. Sign out

That's it for v1. No scheduling, no recaps, no games, no push, no
deep links yet. Once that loop ships and runs on the test device,
add features one at a time, web parity as the north star.

## Concrete first steps when starting the native repo

```sh
# In a fresh directory (NOT inside this kynfowk repo)
npx create-expo-app@latest kynfowk-mobile --template blank-typescript
cd kynfowk-mobile
npx expo install @supabase/supabase-js expo-router expo-secure-store @react-native-async-storage/async-storage
```

Then:

1. Create `lib/supabase.ts` with the supabase-js client. Use
   `AsyncStorage` for session persistence.
2. Build `app/login.tsx` — single email field + "Send link" button
   calling `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: <deep link> } })`.
3. Build `app/index.tsx` — resolves `auth.getUser()` and either shows
   home or redirects to `/login`.
4. EAS build → install on the **G33 (Android 13)** test device that
   was confirmed working previously.

## Test device strategy

From tonight's debugging:

- **Android 13 (G33 / Unisoc 9863A):** App initialised correctly
  with the bumped library set. **Use this as the primary dev device.**
- **Android 11 (Samsung A12):** Same crash signature as the Pixel —
  not Android-version specific in our last attempt, but old enough
  that some newer libraries flag it as legacy.
- **Android 10 (Pixel 3 / 3 XL):** Hit native-level crashes during
  React reconciliation. Very old. **Set minSdkVersion = 26 (Android
  8) at most permissive, ideally 30 (Android 11). Don't optimise for
  Android 10.**

Run every meaningful build on the G33 first. Add older Android
support back only when the core flow is stable.

## Things that bit us last time — avoid

1. **`babel-plugin-module-resolver` aliasing workspace packages
   directly to `.ts` files.** This caused module-identity issues that
   manifested as native crashes during React commit phase. Use
   standard npm/yarn dependencies, not source-aliased workspace pkgs.
2. **Workspace packages with `main: "./index.ts"`.** Metro doesn't
   reliably resolve these. If you ever do share code, dual-build
   to `dist/` first.
3. **`react-native-url-polyfill` left in `dependencies` after removing
   the import.** `@supabase/supabase-js` could transitively re-import
   it and crash on Hermes in RN 0.73. If unused, remove from package.json
   entirely.
4. **Custom `postinstall.js` patching `expo-modules-core` gradle.**
   Don't manually patch native package gradle files. Use
   `expo-build-properties` or upgrade.
5. **Excluding native modules via `react-native.config.js`.** Caused
   silent runtime failures. If a native module isn't needed, remove
   the JS dependency entirely; don't just exclude autolinking.
6. **Migrations in `supabase/migrations/` of this repo are stale.**
   They describe an old schema (`families`, `family_members`, `calls`).
   Production schema is in `family_circles`, `family_memberships`,
   `call_sessions`. Do not run them. The actual schema is whatever
   exists in the live Supabase project.

## Reference: the live web app

- Production: <https://kynfowk.vercel.app>
- This repo on `main` is the source. It's a single Next.js 15.2 app
  at the root (NOT a monorepo, despite what older branches suggest).
- `app/api/*` routes are server endpoints the native app can also
  call (over HTTPS) if it makes sense to share business logic.
- The "Ask Kyn" assistant is implemented via the Anthropic SDK on
  the server — native could reach it via a `/api/ask-kyn` style
  endpoint instead of bundling SDK into the app.

## Open questions for next session

- Push notification provider on iOS (APNs auth key vs cert)?
- Build pipeline: EAS Cloud (paid, easy) vs self-hosted EAS via
  GitHub Actions (free, more setup)?
- Deep-linking strategy for magic-link auth callback?
  (`kynfowk://auth/callback` likely)
- Should native get its own Supabase service role for server-side
  things, or share the existing one?
