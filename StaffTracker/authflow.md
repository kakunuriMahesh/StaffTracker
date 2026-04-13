# Staff Tracker Authentication & Sync Flow

## Overview

This document describes the authentication flow using Google Sign-In, data synchronization with Google Drive App Data Folder, offline storage capabilities, and the JSON structure designed for future Firebase migration.

---

## 1. Google Sign-In Authentication

### How It Works

The app uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication with Google.

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Login Process                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User taps "Sign in with Google"                           │
│                         │                                      │
│                         ▼                                      │
│  2. App generates random code_verifier (64 chars)           │
│                         │                                      │
│                         ▼                                      │
│  3. App generates code_challenge from code_verifier          │
│     using SHA-256 hash (Base64URL encoded)                    │
│                         │                                      │
│                         ▼                                      │
│  4. Browser opens Google OAuth URL with:                      │
│     - client_id (Google Client ID)                          │
│     - redirect_uri (stafftracker://auth)                     │
│     - response_type=code                                    │
│     - code_challenge & code_challenge_method=S256          │
│     - access_type=offline                                    │
│     - scope (openid email profile drive.appdata)             │
│                         │                                      │
│                         ▼                                      │
│  5. User authenticates with Google in browser               │
│                         │                                      │
│                         ▼                                      │
│  6. Google redirects back with:                             │
│     - authorization code                                   │
│     - state (for CSRF protection)                           │
│                         │                                      │
│                         ▼                                      │
│  7. App exchanges code for tokens:                          │
│     - access_token                                          │
│     - refresh_token                                       │
│     - expires_in                                           │
│                         │                                      │
│                         ▼                                      │
│  8. App fetches user info from Google API                    │
│     (id, email, name, picture)                              │
│                         │                                      │
│                         ▼                                      │
│  9. Auth data stored securely in device                     │
│     (expo-secure-store)                                    │
│                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Required Configuration

Before using the app, you need to configure the following in `src/auth/authService.js`:

```javascript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
```

To get the Google Client ID:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID for Web application
5. Configure authorized redirect URIs: `stafftracker://auth`
6. Copy the Client ID to `authService.js`

You also need to configure the redirect URI in `app.json`:

```json
{
  "expo": {
    "scheme": "stafftracker"
  }
}
```

---

## 2. Data Flow from Login to JSON Sync

### Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        Login → Sync Complete Flow                               │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐ │
│  │  Login  │────▶│ Auth Success │────▶│ Load Remote │────▶│  Main   │ │
│  │ Screen │     │             │     │    Data    │     │  App    │ │
│  └──────────┘     └──────────────┘     └─────────────┘     └──────────┘ │
│       │                  │                   │                   │          │
│       │                  ▼                   ▼                   ▼          │
│       │           ┌──────────────┐     ┌─────────────┐     ┌──────────┐   │
│       │           │ Store Auth  │     │ Import JSON │     │ Daily    │   │
│       │           │  in Secure  │     │  to Local  │     │  Usage   │   │
│       │           │   Store     │     │    DB      │     │          │   │
│       │           └──────────────┘     └─────────────┘     └──────────┘   │
│       │                                      │                                  │
│       │                                      ▼                                  │
│       │                              ┌──────────────┐                          │
│       │                              │  Sync Data  │                          │
│       │                              │ to Drive   │                          │
│       │                              │AppDataFolder                          │
│       │                              └──────────────┘                          │
│       │                                      │                                  │
│       │                                      ▼                                  │
│       │                              ┌──────────────┐                          │
│       │                              │ Set Last     │                          │
│       │                              │ Sync Time    │                          │
│       │                              └──────────────┘                          │
│       ▼                                                     │                 │
│  ┌──────────────────────────────────────────────────────────────┐             │
│  │                    Sync Status Events                        │             │
│  │  - sync_start     (when sync begins)                     │             │
│  │  - sync_complete (when successful)                      │             │
│  │  - sync_error    (on failure)                           │             │
│  └──────────────────────────────────────────────────────────────┘             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Description

1. **Login**: User initiates Google Sign-In
2. **Authentication**: OAuth flow completes, tokens stored securely
3. **Load Remote Data**: App downloads JSON from Google Drive App Data Folder
4. **Import Data**: JSON parsed and imported into local SQLite database
5. **Sync to Drive**: Local data exported to JSON and uploaded to Drive
6. **Main App**: User can now use the app with synced data

---

## 3. Offline Storage and Sync

### How Offline Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Offline / Online Sync Logic                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                     │
│  │   App Changes    │────▶│ Queue Pending   │                     │
│  │ (Add/Edit/Delete│     │    Change       │                     │
│  │    Staff)      │     │  (secure-store) │                     │
│  └──────────────────┘     └──────────────────┘                     │
│          │                        │                                  │
│          │                        ▼                                  │
│          │              ┌──────────────────────┐                     │
│          │              │ Check Network Status│                     │
│          │              └──────────────────────┘                     │
│          │                        │                                  │
│          │            ┌──────────┴──────────┐                       │
│          │            │                     │                        │
│          │            ▼                     ▼                        │
│          │    ┌──────────────┐      ┌──────────────────┐            │
│          │    │   Offline   │      │     Online       │            │
│          │    │   - Save   │      │  - Upload JSON   │            │
│          │    │     local  │      │  - Clear queue   │            │
│          │    │  - Cache   │      │  - Update time   │            │
│          │    │   to file │      │                  │            │
│          │    └──────────────┘      └──────────────────┘            │
│          │                                                   │
│          │                                                   │
│          └───────────────────────────────────────────────────┘
│                           │
│                           ▼
│              ┌────────────────────────┐
│              │  Sync Settings Panel  │
│              │  - Auto Sync         │
│              │  - Wi-Fi Only      │
│              │  - Frequency      │
│              └────────────────────────┘
```

### Sync Frequency Options

| Option | Description | Behavior |
|--------|-------------|----------|
| Real-time | Sync on every change | Calls syncData() immediately after any database change |
| Daily | Once per day | Scheduled sync at midnight |
| Weekly | Once per week | Scheduled sync at midnight on Sunday |
| Monthly | Once per month | Scheduled sync at midnight on 1st of month |

### Network Handling

- **Real-time Sync**: When network becomes available (NetInfo listener)
- **Scheduled Sync**: Runs at scheduled time if online
- **Pending Changes**: Stored locally when offline, processed when online

---

## 4. JSON Structure for Firebase Migration

### Current JSON Structure

```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "staff": [
    {
      "id": 1,
      "name": "John Doe",
      "position": "Maid",
      "salary": 15000,
      "salaryType": "monthly",
      "salaryStartDate": "2024-01-01",
      "salaryEndDate": null,
      "phone": "9876543210",
      "joinDate": "2023-06-15",
      "sundayHoliday": true,
      "note": "Experienced staff"
    }
  ],
  "attendance": [
    {
      "id": 1,
      "staffId": 1,
      "date": "2024-01-15",
      "status": "P",
      "note": ""
    }
  ],
  "payments": [
    {
      "id": 1,
      "staffId": 1,
      "amount": 5000,
      "date": "2024-01-10",
      "note": "Advance for emergency",
      "type": "advance"
    }
  ],
  "settings": {
    "syncFrequency": "daily",
    "lastMonthWorkingDays": "26"
  },
  "metadata": {
    "lastModified": "2024-01-15T10:30:00.000Z",
    "appVersion": "1.0.0"
  }
}
```

### Firebase Firestore Migration Mapping

The JSON is designed to map directly to Firestore collections:

```
Current JSON          →    Firestore Structure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

staff: [{}]           →    collection('staff')
                                      └── document(staffId)
                                            ├── name: "John Doe"
                                            ├── position: "Maid"
                                            └── ...

attendance: [{}]     →    collection('attendance')
                                      └── document(attendanceId)
                                            ├── staffId: ref('staff/1')
                                            ├── date: "2024-01-15"
                                            └── ...

payments: [{}]       →    collection('payments')
                                      └── document(paymentId)
                                            ├── staffId: ref('staff/1')
                                            ├── amount: 5000
                                            └── ...

settings: {}         →    document('settings/settings')
                                      └── syncFrequency: "daily"
```

### Migration Notes

When migrating to Firebase:

1. **Authentication**: Replace Google OAuth with Firebase Auth
   - Keep using Google Sign-In but add Firebase Auth provider
   
2. **Database**:
   - Export JSON from Google Drive
   - Import to Firebase Firestore using the mapping above
   - Use Firebase Admin SDK for server-side operations

3. **Sync Changes**:
   - Replace Google Drive API calls with Firestore SDK
   - Use Firestore real-time listeners for live sync
   - Implement offline persistence with Firestore

4. **User Data Isolation**:
   - Use Firebase Auth UID as document path prefix
   - Example: `users/{userId}/staff/{staffId}`

---

## 5. Navigation Flow

### Screen Flow Diagram

```
┌───────────────���─���───────────────────────────────────────────────────────────┐
│                      App Navigation Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐                                                         │
│  │  Login  │◀──────────────────────────────────────────┐              │
│  │ Screen │                                           │              │
│  └────┬────┘                                           │              │
│       │                                                │              │
│       │ (Authenticated)                                │              │
│       ▼                                                │              │
│  ┌──────────────┐     ┌──────────┐                     │              │
│  │   Loading   │────▶│ Main App │                     │              │
│  │    Data     │     │ (Tabs)   │                     │              │
│  └──────────────┘     └────┬────┘                     │              │
│                            │                          │              │
│         ┌──────────────────┼──────────────────────────┘              │
│         │                  │                                          │
│         ▼                  ▼                                          │
│  ┌──────────────┐  ┌──────────────┐                                 │
│  │    Home     │  │   Profile   │                                 │
│  │  (Staff)   │  │   Screen    │                                 │
│  └──────┬─────┘  └─────────────┘                                 │
│         │                                                        │
│         │ (Navigate to detail/edit)                               │
│         ▼                                                        │
│  ┌──────────────┐                                                │
│  │ Staff Detail│                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│         │ (Navigate to edit)                                    │
│         ▼                                                        │
│  ┌──────────┐                                                   │
│  │ Edit Staff│                                                   │
│  └─────┬────┘                                                   │
│        │                                                        │
│        │ (Navigate to settings)                                 │
│        ▼                                                        │
│ ┌────────────────┐                                            │
│ │ Sync Settings  │◀───────────────────────────┐                 │
│ └────────────────┘                         │                      │
│                                             │                      │
└─────────────────────────────────────────────┘
```

### Detailed Navigation Paths

| From | To | Action |
|------|-----|--------|
| Login | Loading Data | After successful auth |
| Loading Data | Main App | After sync complete |
| Main App | Home | Tab selection |
| Home | Staff Detail | Tap staff card |
| Staff Detail | Edit Staff | Edit button |
| Staff Detail | Delete | Delete button → confirm |
| Profile | Sync Settings | Settings button |
| Sync Settings | Logout | Logout button |

---

## 6. Google OAuth Client ID Setup (Detailed Steps)

### Step 1: Go to Google Cloud Console

1. Open your browser and go to: https://console.cloud.google.com/
2. Make sure you're logged into your Google account
3. Select your project from the dropdown at the top (or create a new one)

### Step 2: Navigate to Credentials

1. In the left sidebar, click **APIs & Services**
2. Click **Credentials**

### Step 3: Create OAuth Client ID

1. Click the **Create Credentials** button (blue)
2. Select **OAuth client ID** from the dropdown

### Step 4: Configure OAuth Client

1. **Application type**: Select **Web application**
2. **Name**: Enter `StaffTracker` (or any name you prefer)

### Step 5: Add Authorized Redirect URIs

1. Scroll down to **Restrictions**
2. Find **Authorized redirect URIs** section
3. Click **Add URI** button
4. Enter this URI:
   ```
   https://auth.expo.io/@your-expo-username/stafftracker
   ```
   
   **IMPORTANT**: Replace `@your-expo-username` with your actual Expo username!
   
   Example: If your Expo username is `john123`, use:
   ```
   https://auth.expo.io/@john123/stafftracker
   ```

5. Click **Create** button

### Step 6: Copy the Client ID

1. A popup will appear with your OAuth client details
2. **Copy the Client ID** (it's a long string ending with `.apps.googleusercontent.com`)
3. Click **OK** to close the popup

### Step 7: Update the App Code

1. Open the file `src/auth/authService.js` in your code editor
2. Find these lines (around line 5-6):
   ```javascript
   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
   const REDIRECT_URI = 'https://auth.expo.io/@your-username/stafftracker';
   ```
3. Replace with your actual values:
   ```javascript
   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
   const REDIRECT_URI = 'https://auth.expo.io/@your-username/stafftracker';
   ```
   
   **Replace BOTH:**
   - `YOUR_GOOGLE_CLIENT_ID` → Your actual Client ID from Step 6
   - `@your-username` → Your actual Expo username

### Step 8: Get Your Expo Username

If you don't know your Expo username:
1. Go to https://expo.dev
2. Click **Log in**
3. Your username is shown in your profile (usually in the URL or top-right corner)
4. Or run this command in terminal:
   ```bash
   npx whoami
   ```

### Step 9: Test the Login

1. Run the app:
   ```bash
   npx expo start
   ```
2. On the login screen, tap **Sign in with Google**
3. It should open a browser for Google login
4. After login, it should return to the app with your data synced

---

## 7. Troubleshooting OAuth Errors

### "redirect_uri_mismatch" Error

This means the redirect URI doesn't match exactly what's in Google Console.

**Fix:**
1. Go back to Google Cloud Console
2. APIs & Services > Credentials
3. Click on your OAuth 2.0 Client ID
4. Check **Authorized redirect URIs**
5. Make sure the URI matches exactly: `https://auth.expo.io/@username/stafftracker`
6. If not, add it and click Save

### "Access Denied" or "Invalid Client ID"

**Fix:**
1. Verify you copied the Client ID correctly
2. Make sure there are no extra spaces
3. The Client ID should end with `.apps.googleusercontent.com`

### "Invalid Redirect URI" in Google Console

This means Google changed the rules and now requires a verified domain.

**Fix - Use This Redirect URI Instead:**
```
https://auth.expo.io/@your-username/stafftracker
```

Make sure to replace `@your-username` with your actual Expo username.

---

## 8. Testing Without Google Login

If you're having trouble with Google OAuth, you can still use the app:

1. On the login screen, tap **Continue without login**
2. The app works fully offline with local SQLite storage
3. All features work: add staff, track attendance, calculate salary
4. You can enable Google sync later when you fix the OAuth

---

## 9. Summary of Required Values

| Value | Where to Find | Example |
|-------|---------------|---------|
| Google Client ID | Google Cloud Console OAuth client | `123...abc.apps.googleusercontent.com` |
| Expo Username | `npx whoami` command or Expo dashboard | `john123` |
| Redirect URI | Combine: `https://auth.expo.io/@{username}/stafftracker` | `https://auth.expo.io/@john123/stafftracker` |

---

## 10. Alternative: Using Built-in Expo Auth

Instead of manual OAuth, you can also use `expo-auth-session`:

```bash
npx expo install expo-auth-session
```

Then the code handles redirect URI automatically. See `src/auth/authService.js` for implementation.

### Firebase Migration Setup (Future)

When migrating to Firebase, update these files:

| File | Change Required |
|------|----------------|
| `src/auth/authService.js` | Add Firebase Auth initialization |
| `src/services/driveService.js` | Replace with Firestore SDK |
| `src/services/syncManager.js` | Use Firestore real-time listeners |
| `src/services/jsonDataService.js` | Keep for data export/import |

### App Configuration

**In `app.json`:**
```json
{
  "expo": {
    "scheme": "stafftracker",
    "ios": {
      "bundleIdentifier": "com.yourcompany.stafftracker"
    },
    "android": {
      "package": "com.yourcompany.stafftracker"
    }
  }
}
```

### Required Scopes

| Scope | Purpose |
|-------|---------|
| `openid` | User identity |
| `email` | User email |
| `profile` | User name/picture |
| `https://www.googleapis.com/auth/drive.appdata` | App Data Folder access |

---

## Summary

This implementation provides:

1. **Secure Authentication**: OAuth 2.0 with PKCE using expo-secure-store
2. **Data Persistence**: Local SQLite + Google Drive App Data Folder
3. **Offline Support**: Network detection, pending changes queue, local caching
4. **Flexible Sync**: Real-time, daily, weekly, monthly options
5. **Firebase Ready**: Clean JSON structure mapping to Firestore collections

The architecture allows easy migration to Firebase in the future while maintaining full functionality today.