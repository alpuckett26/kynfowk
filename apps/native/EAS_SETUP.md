# EAS Build → TestFlight Setup

Build and ship Kynfowk to TestFlight from any computer — no Mac required.

---

## Prerequisites

- [ ] Node.js 18+
- [ ] Expo account — [expo.dev](https://expo.dev) (free)
- [ ] Apple Developer account ($99/yr) — [developer.apple.com](https://developer.apple.com)
- [ ] App created in App Store Connect — [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---

## One-time setup

### 1. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 2. Pull the branch
```bash
git clone <repo>
cd kynfowk
git checkout claude/connections-case-studies-JswK1
cd apps/native
npm install
```

### 3. Link to your Expo project
```bash
eas init
```
This fills in `extra.eas.projectId` in `app.json` automatically.

### 4. Create your app in App Store Connect
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **+** → New App
3. Platform: iOS
4. Bundle ID: `com.kynfowk.app`
5. Copy the **App ID** (numeric, e.g. `1234567890`)

### 5. Fill in your credentials in eas.json
Replace the placeholder values in `eas.json` under `submit`:
```json
"appleId": "you@youremail.com",
"ascAppId": "1234567890",
"appleTeamId": "ABCD1234EF"
```

Find your **Team ID** at [developer.apple.com/account](https://developer.apple.com/account) → Membership.

### 6. Set your env vars
Copy `.env.example` to `.env.local` and fill in your Supabase and LiveKit values:
```bash
cp .env.example .env.local
```

---

## Build + ship to TestFlight

### Step 1 — Build in the cloud
```bash
eas build --platform ios --profile testflight
```
- EAS builds on their Mac servers (~15 min)
- You'll get a build link when done

### Step 2 — Submit to TestFlight
```bash
eas submit --platform ios --profile testflight --latest
```
- Uploads the IPA to App Store Connect
- Appears in TestFlight within ~10 min (after Apple processing)

### Step 3 — Add testers in TestFlight
1. App Store Connect → TestFlight → Internal Testing
2. Add your Apple ID as a tester
3. Open TestFlight on your iPhone → install Kynfowk

---

## Subsequent builds

After the first build, every update is just:
```bash
eas build --platform ios --profile testflight --auto-submit
```
`--auto-submit` builds AND submits in one command.

---

## Build profiles explained

| Profile | Distribution | Use for |
|---------|-------------|---------|
| `development` | Internal (ad hoc) | Dev client — live reload on device |
| `preview` | Internal (ad hoc) | Quick team review builds |
| `testflight` | App Store | TestFlight testing |
| `production` | App Store | App Store submission |

---

## Android (no Apple account needed)

```bash
eas build --platform android --profile preview
```
Downloads as an APK — install directly on any Android device.
No developer account, no store required.
