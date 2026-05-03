# Releasing Kynfowk Mobile

End-to-end checklist for cutting a build, getting it onto a device, and shipping it to App Store + Play Store via EAS.

All commands run from `mobile/`.

---

## One-time setup

### Expo account
You need write access to the `ahype` Expo organization (the `owner` in `app.json`). If you're a new collaborator, ask the existing owner to invite you at https://expo.dev/accounts/ahype.

```bash
npx eas-cli login
npx eas-cli whoami   # confirm you see "ahype"
```

### Apple Developer account
Required for any iOS build that lands on a device.

- Enroll at https://developer.apple.com (~$99/yr).
- Note your **Team ID** (Account → Membership) — it's a 10-character alphanumeric string.
- Register the bundle identifier `com.kynfowk.app` at **Certificates, Identifiers & Profiles → Identifiers**.

Then connect EAS to your Apple account (one-time, interactive):

```bash
npx eas-cli credentials
```

Choose iOS, choose `production` profile, and let EAS create + manage your distribution certificate and provisioning profile. You'll be asked to sign in with your Apple ID + an app-specific password.

### App Store Connect listing
Required before `eas submit` can upload anything.

1. Sign in to https://appstoreconnect.apple.com.
2. **My Apps → +** → New App.
3. Name: **Kynfowk**, primary language English (US), bundle ID `com.kynfowk.app`, SKU = anything unique (e.g. `kynfowk-ios-2026`).
4. Save. The new app gets an **ASC App ID** (10-digit number, visible in the URL after creation).
5. Update `eas.json` `submit.production.ios.ascAppId` and `appleTeamId` with the real values.

### Google Play Console
Required for the Android `production` track.

1. Enroll at https://play.google.com/console (~$25 one-time).
2. Create the app shell with package name `com.kynfowk.app`.
3. Set up the **internal testing** track first — easiest path for early users.
4. EAS will need a service-account JSON for `eas submit --platform android`. Generate one in Google Cloud Console (instructions: https://docs.expo.dev/submit/android/).

### EAS secrets

EAS Build runs in the cloud and needs access to env vars. Set them once and they apply to every build:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value 'https://...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_WEB_API_BASE_URL --value 'https://kynfowk.com'
```

`google-services.json` (Android FCM) is already wired through the GitHub Actions workflow as a secret; for EAS Build, upload it once via the web UI (https://expo.dev → project → Configuration → Credentials).

---

## Quick: Android APK for ad-hoc testing

The fastest path to "give my brother an APK to install":

**Option A — via GitHub Actions (no Expo account needed):**

1. https://github.com/alpuckett26/kynfowk/actions/workflows/mobile-android.yml
2. **Run workflow** → branch `master` → Run.
3. Download the `app-release.apk` artifact when the run finishes (~7 min).
4. Sideload onto an Android device (enable "Install unknown apps" for the source).

**Option B — via EAS preview profile:**

```bash
npx eas-cli build --platform android --profile preview
```

EAS builds in the cloud (~10-15 min), then prints a download URL and a QR code. Scan the QR on a phone with Expo Orbit installed and the install happens over the air.

---

## TestFlight (iOS beta)

```bash
npx eas-cli build --platform ios --profile production
```

EAS builds → `.ipa` lands in your Expo dashboard. Then:

```bash
npx eas-cli submit --platform ios --latest
```

Uploads to App Store Connect. Apple processes the build (~5–30 min), then it appears in TestFlight. Add yourself + testers under **TestFlight → Internal Testing**, send invites by email.

---

## App Store full release

1. In App Store Connect, fill out the listing — description, screenshots (use the production build's TestFlight screenshots), age rating questionnaire, **Privacy "nutrition labels"** (data types collected — match what's in `app.json` `privacyManifests` + the M55 Privacy Policy).
2. Set the **price** (Free) and select markets.
3. Pick the build that finished TestFlight processing as the release version.
4. **Submit for Review**. Apple reviews 1–3 days typically.

---

## Google Play full release

```bash
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --latest
```

The submit step uploads the AAB to the **internal testing** track (per `eas.json`). Promote to production manually in Play Console once tested.

---

## Building both at once

```bash
npx eas-cli build --platform all --profile production
npx eas-cli submit --platform all --latest
```

---

## Version + build numbers

`appVersionSource: "local"` in `eas.json` means EAS reads the version from `app.json` (`expo.version` for both, plus `expo.ios.buildNumber` and `expo.android.versionCode`). With `autoIncrement: true` on the production profile, EAS bumps the build number each cloud build automatically — but `version` is still the human-facing semver and you bump it manually when shipping a new release.

Bump `version` for any change with user-visible features. Keep `0.x` until you're confident the schema + flows are stable enough for `1.0`.

---

## Apple In-App Purchase (Plus subscription)

M58 wired the iOS purchase flow. The server validator lives at
`/api/native/iap/apple-receipt`; the mobile button lives at
`mobile/components/UpgradeToPlusButton.tsx` and is rendered on the **Me** tab.

### Required setup before subscriptions can serve

**1. App Store Connect — create an auto-renewable subscription product.**

- App Store Connect → **Kynfowk** → **Monetization → Subscriptions**.
- Create a new **Subscription Group** (e.g. `KynfowkPlus`).
- Inside the group, create a subscription with:
  - **Product ID:** `kynfowk.plus.monthly` (must match the default in `mobile/lib/iap.ts`, or override via `EXPO_PUBLIC_IAP_PLUS_MONTHLY_PRODUCT_ID`).
  - **Reference name:** "Kynfowk Plus — Monthly"
  - **Subscription duration:** 1 month
  - **Price:** whatever tier you want ($9.99/mo per the M44 plan)
  - **Localized display name + description** (App Store reviewer sees these)
  - **Review screenshot** (any iPhone screenshot of the Me tab showing the upgrade button works)
- Repeat for `kynfowk.plus.yearly` if you want a yearly tier (optional).

**2. App Store Connect — generate the App-Specific Shared Secret.**

- App Store Connect → **Kynfowk** → **App Information** → scroll to **App-Specific Shared Secret** → **Generate** (or **Manage** if it exists).
- Copy the long hex string.

**3. Vercel env var for the server validator.**

- Vercel → kynfowk → Settings → Environment Variables.
- `APPLE_SHARED_SECRET` = the secret from step 2. Production + Preview.
- Redeploy.

**4. (Optional) EAS build env override**

If you want to test against different product IDs (e.g. for a sandbox-only product), set EAS secrets:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_IAP_PLUS_MONTHLY_PRODUCT_ID --value 'kynfowk.plus.monthly.sandbox'
```

Otherwise the defaults in `mobile/lib/iap.ts` apply.

### Sandbox testing (before going live)

- App Store Connect → **Users and Access → Sandbox → Testers** → **+ Tester**. Create a sandbox Apple ID — use a fresh email you don't already have logged into the App Store.
- On your iPhone, go to **Settings → App Store → Sandbox Account** and sign in with that tester.
- Install the TestFlight build, open the Me tab, tap **Upgrade to Plus**.
- The StoreKit sheet appears with `[Sandbox]` in the title. Confirm — Apple charges nothing.
- Watch the server log: a request hits `/api/native/iap/apple-receipt`, Apple's verifyReceipt routes to `sandbox.itunes.apple.com`, profile flips to `is_paid_tier=true`.
- Reload the Earn panel — ads should be gone.

### What's NOT yet wired (queued)

- **App Store Server Notifications V2** webhook for renewals, cancellations, refunds, billing failures. Without it, a paid user keeps `is_paid_tier=true` even after Apple cancels — we reconcile lazily on the next purchase or restore. Separate PR.
- **Family Sharing entitlement transfer** — disabled by default in App Store Connect; safe.
- **Google Play Billing** for the Android Plus subscription — separate PR (Play Billing has different ergonomics; the receipt-validator pattern carries over).
- **Web Square checkout** for the same Plus tier — separate PR.

---

## What's NOT yet wired (mobile, queued)

- **AdMob in mobile** — separate PR using `react-native-google-mobile-ads` Expo plugin. Web AdSense (M54) is independent.
- **Apple App Store Server Notifications V2 webhook** — see "What's NOT yet wired" under IAP above.
- **App Tracking Transparency prompt** — string is set in `app.json` but the actual `requestTrackingPermissionAsync()` call happens when AdMob lands.
