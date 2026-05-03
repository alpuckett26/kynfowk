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

## AdMob (mobile ads)

M60 wired AdMob via `react-native-google-mobile-ads` + the
`expo-tracking-transparency` plugin. Five banner placements exist
(Home, Schedule, Family, Inbox, Me tabs). Web AdSense (M54) is
independent.

### Required setup before ads serve

**1. AdMob account + apps**

- Sign up at https://admob.google.com (free, instant approval).
- Create two AdMob apps:
  - **Kynfowk iOS** — get the App ID, format `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`.
  - **Kynfowk Android** — separate App ID (also `ca-app-pub-...~...`).

**2. Replace test App IDs in `mobile/app.json`**

The plugin defaults to AdMob's published test App IDs so the build
doesn't fail pre-approval. Apple rejects apps that ship with the
test ID, so before the App Store submission edit:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-YOURPUBID~YOURANDROIDAPPID",
    "iosAppId": "ca-app-pub-YOURPUBID~YOURIOSAPPID",
    "user_tracking_usage_description": "..."
  }
]
```

**3. Create five banner ad units per platform**

In AdMob → Apps → Kynfowk iOS → **Ad units** → **+ Create ad unit** → Banner. Create five (one for each placement). Repeat for the Android app. Each unit gets a 16-digit ID like `1234567890123456`.

**4. EAS env vars**

```bash
cd mobile
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value 'ca-app-pub-X~Y'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value 'ca-app-pub-X~Y'

# Per-placement banner unit IDs (10 total, 5 placements × 2 platforms)
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_HOME_IOS --value 'ca-app-pub-X/Y'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_HOME_ANDROID --value 'ca-app-pub-X/Y'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_SCHEDULE_IOS --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_SCHEDULE_ANDROID --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_FAMILY_IOS --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_FAMILY_ANDROID --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_INBOX_IOS --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_INBOX_ANDROID --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_ME_IOS --value '...'
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_ME_ANDROID --value '...'
```

Each placement's ad unit can roll out independently — when its env var is unset, the AdBanner for that placement renders nothing (or AdMob test creative in `__DEV__` builds).

### Behavior summary

| Viewer | App ID env var | Slot env var | What renders |
|---|---|---|---|
| Paid tier | any | any | nothing — `null` (paid users skip ads) |
| Free tier | set | set | live AdMob banner + pre-roll on first ad of session + caption |
| Free tier | set | unset (this placement) | nothing |
| Free tier | unset | any | nothing in production. Test banner in `__DEV__`. |

The AdPreRoll ("Sorry fam, gotta pay bills 🤷🏾‍♂️") shows once per session via AsyncStorage. After that, ads carry only the muted caption.

---

## What's NOT yet wired (queued)

- **App Store Server Notifications V2** webhook (renewals, cancellations, refunds, billing failures) — see the IAP section. Without it, paid users keep `is_paid_tier=true` after Apple cancels; we reconcile lazily on next purchase or restore.
- **Google Play Billing** for the Android Plus subscription — separate PR.
- **Web Square checkout** for the same Plus tier — separate PR.
- **Rewarded video** ads — separate PR; ties into the points / rewards-pool flow.
- **AdMob interstitials** (full-screen between sessions) — separate PR.
