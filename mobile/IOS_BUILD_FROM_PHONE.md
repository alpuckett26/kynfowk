# iOS Build From Your Phone

Trigger production iOS builds from the GitHub mobile app — no laptop
needed for routine builds. **One ~10 minute desktop session is
required up front** to register Apple credentials with EAS.

## One-time setup

### Step 1 — Generate `EXPO_TOKEN` (phone-doable)

1. Sign in to https://expo.dev on phone.
2. Account avatar (top-right) → **Account Settings** → **Access
   Tokens** → **+ Create**.
3. Name: `github-actions-ios`. Copy the token.
4. GitHub → **alpuckett26/kynfowk** → **Settings** → **Secrets and
   variables** → **Actions** → **New repository secret**:
   - Name: `EXPO_TOKEN`
   - Value: (the token)

### Step 2 — Confirm the three other secrets exist

The Android workflow already uses these. Check Settings → Secrets:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `WEB_API_BASE_URL` (= `https://kynfowk.com`)

If any are missing, add them.

### Step 3 — Register Apple credentials with EAS (desktop, one time)

This is the only step that needs a desktop. Borrow a Mac/Linux/Windows
machine for ~10 minutes:

```bash
git clone https://github.com/alpuckett26/kynfowk.git
cd kynfowk/mobile
npx eas-cli login                # enter Expo account creds
npx eas-cli credentials          # interactive — see below
```

In the `credentials` flow:

1. Pick **iOS** → **production**.
2. **Distribution Certificate** → "Set up a new Distribution
   Certificate". EAS prompts for your Apple Developer account
   (`aaron.elitetelecom@icloud.com` + 2FA) and auto-generates a cert
   in App Store Connect.
3. **Provisioning Profile** → "Set up a new Provisioning Profile" —
   auto-generates one for `com.kynfowk.app`.
4. **App Store Connect API Key** (recommended for `eas submit`):
   - In App Store Connect → **Users and Access** → **Integrations** →
     **App Store Connect API** → **+** → role **Admin** → download the
     `.p8` key file.
   - Back in the EAS credentials prompt: provide the `.p8` path,
     issuer ID (top of the API Keys page), and key ID. EAS uploads +
     stores it.

Once done, EAS holds everything it needs. Future builds skip the
interactive prompts.

## Routine build (phone-friendly)

1. Open the **GitHub mobile app** → kynfowk repo → **Actions** tab.
2. Pick **Mobile iOS — EAS Build** workflow on the left.
3. Tap **Run workflow** (top-right).
4. Choose:
   - **profile:** `production` (or `preview` for an internal-only build)
   - **submit:** toggle on if you want EAS to auto-upload to App Store
     Connect / TestFlight after the build finishes
5. Tap **Run workflow**.

The Action runs `eas build --non-interactive --no-wait` which queues
the build on EAS's macOS infrastructure and returns immediately. The
GitHub Action job finishes in ~2 min; the underlying EAS build takes
~15–30 min. Watch progress at https://expo.dev → kynfowk project →
**Builds**.

If you opted in to submit, EAS also runs `eas submit --wait` which
blocks until the build completes, then uploads to App Store Connect.
Build appears in TestFlight ~10 min after that.

## Troubleshooting

**"No matching credential found"** — Step 3 (desktop) wasn't done, or
was done against a different EAS project. Check `mobile/eas.json` →
`extra.eas.projectId` matches the project on expo.dev.

**"Apple session expired"** — App Store Connect API key expired or
was revoked. Regenerate from ASC and re-run `eas credentials`.

**Build fails on type check** — fix locally and push; the workflow
runs `tsc --noEmit` before kicking off the EAS build, so type errors
fail fast in GitHub Actions before burning EAS minutes.

**Submit fails with "Build not yet ready"** — EAS build still
processing. Wait for the build to show "finished" on expo.dev, then
re-run with submit on (it'll pick up the latest finished build via
`--latest`).
