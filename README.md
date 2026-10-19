# Kynfowk

Kynfowk is a family coordination and calling product built with Next.js, Expo, and Supabase. Families create a Family Circle, invite relatives, share availability, find overlapping times, schedule or ring calls, and build a record of their Family Connections over time.

The repository contains two clients:

- `app/`, `components/`, and `lib/`: the Next.js web app and backend-for-frontend API deployed to Vercel.
- `mobile/`: the Expo React Native app for iOS and Android.

Both clients use the same Supabase project and data model.

## Product capabilities

### Coordination and calls

- Supabase email authentication, invite claiming, password recovery, and managed profiles
- Multiple Family Circles with an active-circle selector
- Owner-managed invitations, member profiles, relationships, blocking, and parental consent
- Recurring weekly availability and seven-day overlap suggestions
- One-off and recurring call scheduling, automatic scheduling, calendar files, and join links
- Built-in Ring Now and live-call flows with presence, answer, decline, cancel, and completion states
- Missed-call recovery, attendance, actual duration, recaps, and Family Connections metrics

### Family engagement

- In-app inbox, email reminders, browser push, Expo push, and weekly summaries
- Family activity, phonebook, addresses, relationship graph, family units, and photo/video reel
- Polls, family prompts, prayer chain, and in-call games
- PWA manifest, offline fallback, install prompt, deep links, and mobile universal/app links
- Pilot feedback, product-event tracking, admin analytics, audit tools, and test fixtures
- Optional Kyn assistant, Square subscriptions, and Apple subscription verification

## Architecture

```text
Web browser / PWA -+
                   +-- Next.js App Router + /api/native/* -- Supabase Auth/Postgres/Realtime/Storage
Expo iOS/Android --+                         |
                                             +-- Resend email
                                             +-- Web Push / Expo Push
                                             +-- Anthropic support assistant
                                             +-- Square / Apple billing

Vercel Cron -- notification sweep, recurrence materialization, auto-scheduling
```

The web app uses Server Components and Server Actions for browser flows. The native app calls authenticated `/api/native/*` route handlers using its Supabase access token.

## Local setup

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- Supabase CLI when applying migrations from the command line
- Expo/EAS tooling only when working on the mobile app

### Web app

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The minimum web configuration is:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For auth callbacks, allow `http://localhost:3000/auth/callback` in Supabase Auth URL Configuration.

### Database

Migrations are append-only and live in `supabase/migrations`. Apply every unapplied file in timestamp order:

```powershell
npx supabase db push
```

The schema includes profiles, circles, memberships, availability, call sessions and attendance, notifications and push subscriptions, presence, family engagement features, auto-scheduling, admin controls, and billing metadata.

### Mobile app

```powershell
Set-Location mobile
npm install
Copy-Item .env.example .env.local
npm run start
```

The mobile app expects the same Supabase project as the web app and calls the deployed web API. See [mobile/README.md](mobile/README.md) and [mobile/RELEASING.md](mobile/RELEASING.md) for device and store-build details.

## Environment variables

Keep server secrets out of `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` variables.

### Core

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin access for cron, admin, invitations, and delivery jobs |
| `NEXT_PUBLIC_SITE_URL` | Canonical web origin and auth callback base |
| `ADMIN_EMAILS` | Comma-separated internal admin email allowlist |
| `CRON_SECRET` | Protects cron and manual sweep endpoints |
| `FUNCTIONS_SECRET` | Protects internal push/function calls |

### Notifications and support

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Email delivery |
| `NOTIFICATION_FROM_EMAIL` | Verified sender address |
| `NOTIFICATION_FROM_NAME` | Sender display name |
| `NOTIFICATION_REPLY_TO` | Reply-to address |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser push subscription key |
| `VAPID_PRIVATE_KEY` | Server-side Web Push key |
| `VAPID_SUBJECT` | VAPID contact, usually `mailto:...` |
| `EXPO_ACCESS_TOKEN` | Expo Push access token when enabled |
| `ANTHROPIC_API_KEY` | Optional Kyn support assistant |

### Billing and distribution

Square, Apple subscription verification, ads, and app-link verification use additional variables documented near their integrations in `lib/square.ts`, `lib/iap-apple-verify.ts`, `lib/ads.ts`, and the well-known route handlers. They are optional for core family scheduling.

## Scheduled jobs

`vercel.json` defines three daily jobs:

- `/api/notifications/sweep`: creates and delivers reminders and digests.
- `/api/cron/recurrence-materialize`: turns recurring rules into scheduled calls.
- `/api/cron/auto-schedule`: creates calls for circles that opted into automatic scheduling.

All jobs are idempotent and require the production service-role and cron configuration.

## Verification

Run the web checks from the repository root:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Playwright targets `https://kynfowk.com` by default. Configure a dedicated pilot account in `.env.test` using `tests/e2e/.env.test.example`, then run:

```powershell
npm run test:e2e
```

Run native checks separately:

```powershell
Set-Location mobile
npm run lint
npm run typecheck
npm test -- --runInBand
```

## Deployment

- Vercel deploys the Next.js app and cron routes. Production is `https://kynfowk.com`.
- Supabase migrations must be applied separately; a Vercel deployment does not update the database.
- EAS builds the native clients. GitHub workflows under `.github/workflows` cover mobile build tasks.
- Store release commands and credentials are documented in [mobile/RELEASING.md](mobile/RELEASING.md).

Before a release, verify the Vercel environment, apply migrations, run web and mobile checks, exercise the authenticated E2E suite, and confirm notification/push delivery with a real test device.

## Repository map

| Path | Responsibility |
| --- | --- |
| `app/` | Web pages, Server Actions, route handlers, cron, auth callbacks |
| `components/` | Reusable web UI and feature components |
| `lib/` | Data access, scheduling, notifications, realtime, billing, and utilities |
| `mobile/` | Expo Router app, native hooks, components, and tests |
| `supabase/migrations/` | Ordered additive schema and RLS changes |
| `tests/e2e/` | Playwright authenticated web journeys |
| `lib/__tests__/` | Web unit tests |
| `.github/workflows/` | Mobile CI and build workflows |

## Product language

Kynfowk uses warm, family-centered language throughout the product: Family Circle, Family Connections, Moments Shared, Time Together, and Reconnection Streak.
