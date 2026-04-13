# StaffTracker

A mobile application for managing household staff, tracking attendance, and calculating salary payments. Built with Expo (React Native) and SQLite.

## Features

- **Staff Management**: Add, edit, and delete staff members with roles (Maid, Cook, Driver, Gardener, Security, Watchman)
- **Daily Attendance**: Mark daily attendance as Present, Absent, or Leave
- **Monthly Summary**: View attendance calendar and salary calculations per staff
- **Salary Calculation**: Automatic salary pro-rata based on attendance
- **Advance Payments**: Record and track advance payments to staff
- **Payslip Export**: Generate and share salary slips as PDF
- **Google Sign-In**: Sync data with Google Drive (optional)
- **Offline Support**: Works without internet, syncs when online

---

## Quick Start (No Setup Required)

```bash
# Install dependencies
npm install

# Start the app (works immediately with local storage)
npx expo start

# Or tap "Continue without login" on the login screen
```

The app works **fully offline** without Google Sign-In. Just tap "Continue without login".

---

## Part 1: Building the App (APK)

### Option A: Local Debug Build (Free - Recommended for testing)

```bash
# Build debug APK locally
cd android
./gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

Or use Expo:
```bash
npx expo run:android
```

**This creates a working APK** that installs and runs on any Android device.

### Option B: EAS Build (For production release)

**Requires EAS account** (free to sign up):
```bash
# 1. Login to EAS
npx eas login

# 2. Configure project (first time)
npx eas project init

# 3. Build Android APK
npx eas build -p android --profile preview

# 4. Or build for Play Store
npx eas build -p android --profile production
```

**EAS is only needed if you want:**
- Play Store release (signed with Play keystore)
- TestFlight for iOS
- Remote builds (not local computer)

**For local testing, just use Option A** - it's free and works.

---

## Part 2: Google Sign-In Setup (Optional)

**This is FREE** - uses Google Cloud Console (no EAS needed).

To enable Google Sign-In, update `src/auth/authService.js` after creating the OAuth client:

```bash
# Edit the authService.js file and replace:
#   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
#   const REDIRECT_URI = 'https://auth.expo.io/@your-username/stafftracker';
# With your actual values from Google Cloud Console
nano src/auth/authService.js
```

### Why Google Sign-In?

- Syncs data to Google Drive (backup across devices)
- No manual backup/restore needed

### Step 1: Create OAuth Client in Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select your project (or create new)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Fill:
   - **Name**: `StaffTracker`
   - **Authorized JavaScript origins**: `https://auth.expo.io`
   - **Authorized redirect URIs**: Click "Add URI" and add:
     ```
     https://auth.expo.io/@your-expo-username/stafftracker
     ```
     (Replace `@your-expo-username` with your Expo username)
7. Click **Create**
8. Copy the **Client ID** (ends in `.apps.googleusercontent.com`)

### Step 2: Update the App

1. Open `src/auth/authService.js`
2. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID:
```javascript
const GOOGLE_CLIENT_ID = '123456789-abc.apps.googleusercontent.com';
```

### Step 3: Test

```bash
npx expo start
```

Now "Sign in with Google" will work.

---

## Part 3: Google Play Store (Optional)

**Requires:**
1. Google Play Developer account ($25 one-time)
2. EAS build OR local release build

### To build for Play Store:

```bash
# 1. Generate signing key (one time)
keytool -genkeypair -v keystore my-release-key.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000

# 2. Configure eas.json with your keystore
npx eas build -p android --profile production

# 3. Upload to Play Store
npx eas submit -p android
```

---

## Summary: What You Need

| Task | Required | Cost |
|------|----------|------|
| Run app locally | Nothing | Free |
| Local APK test | Option A | Free |
| Google Sign-In | Google Cloud Console | Free |
| EAS Build | EAS account | Free |
| Play Store release | Play Developer + EAS | $25 + free |

---

## Part 4: Firebase Migration (Future)

The JSON structure is ready for Firebase migration:

```json
{
  "staff": [{ "id": 1, "name": "..." }],
  "attendance": [{ "staffId": 1, "date": "...", "status": "P" }],
  "payments": [{ "staffId": 1, "amount": 5000 }],
  "settings": { "syncFrequency": "daily" },
  "metadata": { "version": "1.0.0" }
}
```

Maps directly to Firestore collections.

---

## App Structure

```
StaffTracker/
├── App.js                 # Main app with navigation
├── app.json              # Expo configuration
├── src/
│   ├── auth/
│   │   └── authService.js     # Google OAuth
│   ├── services/
│   │   ├── driveService.js   # Google Drive API
│   │   ├── syncManager.js   # Sync logic
│   │   └── jsonDataService.js # Data conversion
│   ├── database/
│   │   └── db.js           # SQLite operations
│   └── screens/
│       ├── LoginScreen.js
│       ├── HomeScreen.js
│       ├── DailyScreen.js
│       ├── MonthlyScreen.js
│       ├── ProfileScreen.js
│       └── SyncSettingsScreen.js
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Invalid redirect_uri" | Update redirect URI in Google Cloud Console |
| "Access denied" | Add authorized origins in Google Console |
| "Token expired" | Re-login with Google |
| Build fails | Run `npx expo install` first |

---

## License

MIT