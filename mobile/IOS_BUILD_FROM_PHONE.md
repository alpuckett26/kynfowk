# iOS Build From Your Phone

Trigger production iOS builds from the GitHub mobile app — **no
desktop required at any point.** Uses an App Store Connect API key
so EAS auto-generates the Apple Distribution Certificate +
Provisioning Profile on the first build.

## One-time setup (≈15 min, all on phone)

### Step 1 — Create an App Store Connect API key

1. **App Store Connect** in mobile Safari → **Users and Access** →
   **Integrations** tab → **App Store Connect API**.
2. Tap **+** → name it `EAS CI` → role **Admin** → **Generate**.
3. After it's created you'll see three things to capture:
   - **Issuer ID** — the UUID at the top of the API Keys page.
     Long-press → Copy.
   - **Key ID** — 10-char string next to the key name. Copy.
   - **Download API Key** button → tap. iOS saves
     `AuthKey_XXXXXXXXXX.p8` to your **Files** app (Downloads
     folder by default).

> ⚠️ Apple only lets you download the .p8 ONCE. If you lose it you
> have to revoke + regenerate the key.

### Step 2 — Convert the .p8 to base64 (one tap, in Files)

GitHub Secrets need a string, not a file. iOS Files app can
base64-encode via the Shortcuts app — but the easiest path is to
use a free web converter:

1. Open `https://www.base64encode.org/` in mobile Safari.
2. Tap **Choose File** → **Browse** → Files → Downloads →
   `AuthKey_XXXXXXXXXX.p8`.
3. Tap **ENCODE** → tap **Copy to clipboard** under the result.

The resulting base64 string is what GitHub Secrets needs.

### Step 3 — Generate `EXPO_TOKEN`

1. Sign in to https://expo.dev on phone.
2. Account avatar (top-right) → **Account Settings** → **Access
   Tokens** → **+ Create**.
3. Name: `github-actions-ios`. **Copy** the token.

### Step 4 — Add all secrets to GitHub

GitHub mobile app → **alpuckett26/kynfowk** → **Settings** →
**Secrets and variables** → **Actions** → **New repository secret**
(repeat for each):

| Name | Value |
|---|---|
| `EXPO_TOKEN` | (from Step 3) |
| `ASC_API_KEY_P8_BASE64` | (the base64 from Step 2) |
| `ASC_API_KEY_ID` | (10-char Key ID from Step 1) |
| `ASC_API_ISSUER_ID` | (UUID Issuer ID from Step 1) |

These three are reused from the Android workflow — confirm they
exist; add if not:

| Name | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://YOUR.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (Supabase project anon key) |
| `WEB_API_BASE_URL` | `https://kynfowk.com` |

That's it for setup. Every routine build from now on is a tap.

## Routine build (60 sec on phone)

1. **GitHub mobile app** → kynfowk repo → **Actions** tab.
2. Pick **Mobile iOS — EAS Build** workflow on the left.
3. Tap **Run workflow** (top-right).
4. Choose:
   - **profile:** `production` (or `preview` for an internal-only
     build)
   - **submit:** toggle on if you want EAS to auto-upload to App
     Store Connect / TestFlight after the build finishes.
5. Tap **Run workflow**.

The Action runs `eas build --non-interactive --no-wait` which
queues the build on EAS's macOS infrastructure and returns
immediately. The GitHub Action job finishes in ~2 min; the actual
iOS build takes ~15–30 min on EAS.

Watch progress at https://expo.dev → kynfowk → **Builds** (mobile
Safari renders this fine).

If you opted in to submit, EAS also runs `eas submit --wait` which
blocks until the build completes, then uploads to App Store
Connect. Build appears in TestFlight ~10 min after that.

## What happens on the first build

EAS sees you've configured an ASC API key but no Distribution
Certificate / Provisioning Profile yet. It uses the API key to:

1. Generate a new Distribution Certificate in your Apple Developer
   account (visible at developer.apple.com → Certificates).
2. Generate a Provisioning Profile for `com.kynfowk.app` (visible
   at developer.apple.com → Profiles).
3. Sign the build with both.

These get cached in EAS's project credentials store. Subsequent
builds reuse them silently.

## Troubleshooting

**Workflow fails at "Decode App Store Connect API key" step** —
`ASC_API_KEY_P8_BASE64` secret missing or malformed. Re-encode the
.p8 from Step 2 and re-add the secret.

**"Apple session expired" mid-build** — API key was revoked. Repeat
Steps 1–2 to generate + base64 a new one, then update the
`ASC_API_KEY_P8_BASE64` secret in GitHub.

**Build fails on type check** — fix locally and push; the workflow
runs `tsc --noEmit` before kicking off the EAS build, so type errors
fail fast in GitHub Actions before burning EAS minutes.

**Submit fails with "Build not yet ready"** — EAS build still
processing. Wait for the build to show "finished" on expo.dev, then
re-run with submit on (it'll pick up the latest finished build via
`--latest`).

**"There was an error verifying your App Store Connect API
credentials"** — Issuer ID / Key ID typo, or the .p8 base64 doesn't
decode cleanly. Verify Step 1 values and re-encode the .p8.
