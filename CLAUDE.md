# Kynfowk — Operating Rules for Claude Code

Project context lives in `AGENTS.md` (product, tone, vocabulary). This file is operational — how to **work in this repo without making the mistakes I've already made**.

## State before action

The codebase is the only record of state. The plan file, my own memory, and the conversation history are all secondary. **When uncertainty exists, run git first.**

Before answering any question shaped like *"did we already do X?"*, *"is X live?"*, *"what's the state of Y?"*:

```bash
git fetch origin && git log --oneline origin/master -15 && git branch -a | grep claude/
```

Before creating a new branch:

```bash
git branch -a | grep '<prefix-you-plan-to-use>'   # check for collisions
git pull origin master                             # always branch from latest
```

Before claiming a PR is the right next step, verify the work isn't already on master.

## Watch shell output for state signals

When `git pull`, `git checkout <branch>`, or `git checkout -b <name>` produces output mentioning files I thought I was about to create — **stop**. Those files exist already. Read them before doing anything else.

A redundant `M50: …-cleanup` branch was created in this session because I ignored a `git pull` summary that said `create mode 100644 components/swipe-shell.tsx`. Don't repeat that.

## Squash-merge audit

GitHub squash-merges turn N commits on a branch into 1 commit on master. If a PR has multiple commits **always** verify the squash-merge captured all of them:

```bash
git log --oneline <branch>..origin/master   # commits ahead
git log --oneline origin/master..<branch>   # commits the squash should have included
```

In this session a race-condition retry was lost in a squash because the second commit landed after the merge was already queued. The fix took two more PRs to recover.

## Don't fix what might not be broken

Strange-looking copy in a user's screenshot may be **user-supplied data**, not a bug. Profile names, circle names, member display names, custom availability labels — all editable by the user. Before "fixing" UI text:

1. Trace the data path. Is it from `props`, server-side data, or hard-coded?
2. If it's from data, the user owns it. Surface the question, don't patch the code.

## Plan files are intent, not state

`/root/.claude/plans/*.md` is what we want to do. The codebase is what we've actually done. When they conflict, the codebase wins. Always.

When a plan describes work that *might already be merged*, run the state checks above before acting on it.

## Pre-PR checks

For every PR I open in this repo:

```bash
npx tsc --noEmit 2>&1 | grep -v -E '@xyflow|family-tree-canvas|push-notification-handler|deep-link-handler' || echo "✓ no errors in touched files"
```

The grep filter exists because the listed files have known pre-existing errors that resolve at deploy time. **Add to the filter only when adding a new pre-existing-error file, never to hide an error in code I just touched.**

## What's where

- `app/` — Next.js web app (this is what `kynfowk.com` serves)
- `mobile/` — Expo (React Native) client. Has its own `package.json`, `eas.json`, etc. Independent build pipeline via EAS. **No Capacitor — that was removed in M52.**
- `lib/` — shared web utilities + server-side code
- `components/` — shared React components for the web app
- `supabase/migrations/` — schema changes. Append-only, timestamped. User runs them via Supabase SQL editor; I never run them automatically.
- `.github/workflows/mobile-android.yml` — Expo APK build, fires on `mobile/**` changes only
- Vercel auto-deploys `master` to `kynfowk.com`. Web changes are live within minutes of merge.
- Store releases: `cd mobile && eas build --platform all --profile production && eas submit`

## Branch + PR naming

Pattern: `claude/m<number>-<short-kebab-summary>`. Numbers are sequential project milestones. Check the most recent milestone number before picking a new one:

```bash
git log --oneline | grep -oE 'M[0-9]+' | sort -V -u | tail -5
```

PRs target `master`. Never push directly to `master`.

## When in doubt

Ask. The cost of one clarifying question is always lower than the cost of redoing work or breaking production.
