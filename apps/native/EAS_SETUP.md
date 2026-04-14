# EAS Build → TestFlight Setup

Build and ship Kynfowk to TestFlight from any computer — no Mac required.

---

## Current status (already done)

| Item | Status |
|------|--------|
| EAS project created | ✅ `@ahype/kynfowk` (ID: `8d4e3725-0286-4a06-81e1-411f265674d4`) |
| App Store Connect API key | ✅ Stored in EAS as `V49U67RZ3A` |
| Android APK build | ✅ Queued — [view build](https://expo.dev/accounts/ahype/projects/kynfowk/builds/28e10671-afe2-4a54-a022-9f5c4f380fd7) |
| iOS credentials | ⏳ Needs one interactive step (see below) |

---

## iOS — one-time credential setup (run from your laptop)

The App Store Connect API key is already stored in EAS. You just need one
interactive session to let EAS use it to generate your Distribution Certificate
and Provisioning Profile.

```bash
# Install EAS CLI if you don't have it
npm install -g eas-cli

# Log in to the ahype Expo account
eas login
# username: ahype  email: aaron@lectricash.com

# Navigate to the native app
cd apps/native

# Trigger the iOS build interactively (one time only)
eas build --platform ios --profile testflight
```

When prompted, EAS will offer to use the stored API key `V49U67RZ3A` — say **yes**.
It will connect to Apple, create the Distribution Certificate + Provisioning Profile,
store them in EAS, and submit the cloud build.

**After this one run, all future iOS builds are fully automated** (no Mac required):
```bash
eas build --platform ios --profile testflight --non-interactive
```

---

## Submit to TestFlight (after iOS build completes)

```bash
eas submit --platform ios --profile testflight --latest
```
- Appears in TestFlight within ~10 min after Apple processes it
- App Store Connect → TestFlight → Internal Testing → add your Apple ID → install on iPhone

### Fill in submit credentials first

Edit `eas.json` and replace placeholder values:
```json
"appleId": "your-actual-apple-id@email.com",
"ascAppId": "your-numeric-app-id-from-app-store-connect",
"appleTeamId": "your-10-char-team-id"
```

Find your **Team ID** at [developer.apple.com/account](https://developer.apple.com/account) → Membership.

Find the **App ID** (numeric) in App Store Connect → My Apps → select app → App Information → Apple ID.

---

## Subsequent builds (fully automated)

```bash
# iOS + submit to TestFlight in one command
eas build --platform ios --profile testflight --auto-submit --non-interactive

# Android APK
eas build --platform android --profile preview --non-interactive
```

---

## Build profiles

| Profile | Distribution | Use for |
|---------|-------------|---------|
| `development` | Internal (ad hoc) | Dev client — live reload on device |
| `preview` | Internal (ad hoc) | Quick team review, APK direct install |
| `testflight` | App Store | TestFlight testing |
| `production` | App Store | App Store submission |

---

## Android — no Apple account needed

```bash
eas build --platform android --profile preview
```
Downloads as an APK — install directly on any Android device.
No developer account, no store required.
