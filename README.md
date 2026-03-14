# Kynfowk

Kynfowk is a family coordination and call scheduling MVP built with Next.js App Router, TypeScript, and Supabase. Families can sign up, create a Family Circle, add relatives, share availability, schedule calls from overlap, and track Family Connections over time.

## Features

- Warm landing page with family-centered positioning
- Email/password authentication with Supabase
- Onboarding flow for Family Circle setup, member invites, and availability collection
- Dashboard with upcoming calls, overlap-based scheduling suggestions, recent activity, and connection stats
- Member-managed availability page linked from the dashboard for viewing and updating recurring weekly windows
- More polished dashboard highlights, readiness cards, and empty states
- Connections counter for completed calls, total minutes, unique family members connected this week, and Reconnection Streak
- Post-call summary workflow for capturing what happened and what comes next
- Invite claiming so pending family members can join their Family Circle automatically after authentication
- Case studies page with five polished storytelling examples
- Additive Supabase SQL migration for profiles, circles, memberships, availability, calls, participants, and activity

## Tech stack

- Next.js App Router
- TypeScript
- Supabase Auth + Postgres
- Simple reusable components with custom CSS

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create env vars

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notes:

- Use the Supabase project URL and anon key from your project settings.
- `NEXT_PUBLIC_SITE_URL` should match the URL you use locally so auth callback redirects land correctly.
- If you enable email confirmation in Supabase Auth, add `http://localhost:3000/auth/callback` to your redirect URLs.

### 3. Apply the database migration

If you use the Supabase CLI:

```bash
supabase db push
```

If you prefer the SQL editor, run the SQL files in `supabase/migrations` in timestamp order.

### 4. Run the app

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Optional verification commands:

```bash
npm run lint
npm run typecheck
npm run build
```

## Suggested local flow

1. Create an account on `/auth/sign-up`.
2. Finish onboarding on `/onboarding`.
3. Open `/dashboard` to review suggestions and schedule a call.
4. Mark a scheduled call complete to see the connection stats update.
5. Save a post-call summary to capture the highlight and next step.

## Project structure

- `app` - App Router pages, layout, styles, and server actions
- `components` - reusable UI and form components
- `lib` - Supabase helpers, scheduling logic, and data access
- `supabase/migrations` - additive database schema

## Notes

- The app uses sensible MVP defaults, including a default timezone of `America/Chicago`.
- Invites are modeled as pending family memberships so the dashboard can show invited relatives immediately.
- Overlap suggestions are generated from shared weekly availability windows, merged into realistic contiguous blocks, and ranked by participant coverage.
- Post-call recaps are stored separately from call sessions so the feature can grow into richer summaries, follow-ups, and memory threads later.

## Next milestones

- Let each family member manage their own availability directly from the dashboard.
- Support recurring scheduling preferences and reminders for weekly Family Connections.
- Add richer post-call memories, attachments, and searchable Moments Shared history.
- Introduce admin analytics and demo seed data for stronger investor walkthroughs.
