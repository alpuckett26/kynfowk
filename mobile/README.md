# Kynfowk Mobile

Kynfowk Mobile is the Expo React Native companion to the Next.js web app. It uses the same Supabase project and accesses server-owned workflows through authenticated `/api/native/*` endpoints on `kynfowk.com`.

## Current capabilities

- Email authentication, session persistence, onboarding, and active-circle selection
- Home dashboard, family activity, notifications, and profile/settings screens
- Family management, invitations, placeholders, relationships, cross-circle links, and phonebook
- Availability, overlap suggestions, one-off scheduling, recurring calls, and auto-schedule settings
- Call detail, Ring Now, foreground incoming-call handling, live WebRTC calls, and completion/recap flows
- Expo push registration and notification deep links
- Polls, prompts, prayer chain, family reel, and feedback
- Protected mobile admin screens for users, circles, and audit data

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run start
```

Use `npm run android` for an Android emulator/device or `npm run ios` on macOS. Development builds are preferred for WebRTC and push behavior because those native modules are not fully represented in Expo Go.

Configuration:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_WEB_API_BASE_URL=http://YOUR-LAN-IP:3000
EXPO_PUBLIC_APP_ENV=development
```

For production, `EXPO_PUBLIC_WEB_API_BASE_URL` should be `https://kynfowk.com`. The API forwards the current Supabase bearer token, so web and mobile must point at the same Supabase project.

## Deep links

- Custom scheme: `kynfowk://`
- Universal/app link host: `https://kynfowk.com`
- Auth callback: `kynfowk://auth/callback`

Add the callback URLs used by development and production builds to Supabase Auth URL Configuration. Associated-domain and Android asset-link routes are served by the web app.

## Verification

```powershell
npm run lint
npm run typecheck
npm test -- --runInBand
```

Push notifications, Ring Now, camera/microphone permissions, and live calls must also be tested on physical devices.

## Builds and releases

```powershell
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform all --profile production
```

Production builds use remote versioning and EAS configuration in `eas.json`. See [RELEASING.md](RELEASING.md) for the release checklist and [IOS_BUILD_FROM_PHONE.md](IOS_BUILD_FROM_PHONE.md) for the iOS-specific workflow.

## Structure

- `app/`: Expo Router screens and layouts
- `components/`: native UI and feature components
- `hooks/`: session, push, and incoming-call lifecycle hooks
- `lib/`: Supabase client, authenticated API client, and native utilities
- `assets/`: app icons and splash assets
