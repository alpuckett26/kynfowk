# Kynfowk Mobile

React Native (Expo) companion to the Next.js web app. Talks to the
**same Supabase project** as production. See `../NATIVE_PLAN.md` for
the architectural decisions and rationale.

## Setup

```sh
cd mobile
npm install
# If anything's out of date with the SDK, align it:
npx expo install --fix
```

Copy env:

```sh
cp .env.example .env.local
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
# from the same Supabase project the web app uses.
```

## Running

```sh
npx expo start            # starts the dev server
# Then 'a' in the terminal launches Android emulator,
# 'i' launches iOS simulator (Mac only).
# Or scan the QR code with Expo Go on your phone.
```

## Building an APK

```sh
# First time only:
npx eas-cli@latest login
npx eas-cli@latest build:configure
# Build:
npx eas-cli@latest build --platform android --profile preview
```

## What's here in v0

- `app/index.tsx` — home screen. Reads current user, looks up their
  `family_memberships` row, shows their family circle name. Bare.
- `app/login.tsx` — magic-link sign-in.
- `app/auth/callback.tsx` — handles the deep-link from the email.
- `lib/supabase.ts` — the Supabase client with AsyncStorage persistence.

## What's NOT here yet

- Upcoming calls list (`call_sessions` query) — next
- Call detail screen
- Push notifications (Expo + APNs/FCM)
- LiveKit / video room
- Family member invites
- Polls, games, photo carousel, chyron — all later

## Test devices (from prior debugging)

- **G33 (Android 13):** confirmed working baseline. Use first.
- **Android 11 (Samsung A12):** acceptable.
- **Android 10 (Pixel 3):** known issues with newer RN — skip.

## Deep-link config

The magic-link callback uses `expo-linking`'s `createURL("/auth/callback")`.
In dev that's `exp://...`, in standalone apps it's `kynfowk://auth/callback`
(the `scheme` from `app.json`). When you provision the dev/prod build,
add the same callback URL to the Supabase Auth → URL Configuration →
Redirect URLs allow-list.
