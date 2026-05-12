# Changelog

## 📋 Bill Screen Overhaul + Period Navigation + Offline-First Sync (v3 - Latest)

### Overview
Major rework of the Bill (Monthly) screen with period navigation, salary-type-based staff filtering, and a cleaner summary card. Fixed data persistence race condition where sync on startup would overwrite local edits.

### Key Changes

#### 1. Bill Screen — Period Navigation
- Added `< May 2026 >` arrows to navigate between months, weeks, or days
- Selector dropdown (top-right) switches between **All**, **Monthly**, **Weekly**, **Daily** views
- "All" period uses staff `join_date` → today for meaningful totals

#### 2. Staff Filtered by Salary Type
- Staff pills now filter based on selected period:
  - **Monthly** → shows only monthly-paid staff (default)
  - **Weekly** → shows only weekly-paid staff
  - **Daily** → shows only daily-paid staff
  - **All** → shows all staff
- Auto-selects first matching staff when filter changes

#### 3. Enhanced Summary Card
- **Period badge** with exact date range (e.g. "01 May 2026 — 31 May 2026")
- **Staff info row** with avatar, name, and position
- **Base salary** row showing rate (₹X/month, ₹X/week, or ₹X/day)
- **Paid days** row showing attendance count / total days
- **Gross salary**, **Advances deducted**, **Net payable** breakdown

#### 4. Offline-First Sync Fix
- **Root Cause**: `syncManager.js` downloaded Drive backup and replaced local data via `importFromDB('replace')`
- **Fix**: Removed timestamp-comparison replace block; sync now uses `importFromDB('merge')` where dirty-local records always win
- Added dirty-flag tracking (`sync_status`) on all CRUD operations in `db.js`
- New helpers: `getDirtyRecords()`, `hasDirtyRecords()`, `clearSyncStatus()`
- `importFromJSON('merge')` skips overwriting dirty local records

#### 5. Cleanup
- Removed dead calendar picker modal and unused date-picker code
- Removed unused `getCalendarTheme()`, `markedDates`, `customStart/customEnd` states
- Removed `expo-print` / `expo-sharing` related dead references
- Removed obsolete filter modal with "Apply" button — replaced by inline dropdown

### Files Changed
- `StaffTracker/src/screens/MonthlyScreen.js` — Major overhaul
- `StaffTracker/src/database/db.js` — Dirty-flag tracking, merge mode
- `StaffTracker/src/services/syncManager.js` — Offline-first sync flow
- `StaffTracker/src/storage/localStorage.js` — Sync queue functions
- `StaffTracker/App.js` — Tab label "Bill" with receipt icon

---

## 🍏 Plan Expiry + Staff Locking System (v2 - Latest)

### Overview
This update fixes all loopholes in the plan expiry handling system. Plan is now checked dynamically on every action, not just at app start.

### Key Improvements

#### 1. Real-time Plan Validation
- Plan is now checked **on every action** (add staff, edit staff, mark attendance, add advance)
- Plan changes are detected in real-time via listeners
- All screens reload staff list when plan is upgraded/downgraded

#### 2. Plan Cache with Invalidation
- Added `cachedPlanData` to avoid repeated file reads
- Cache is cleared and listeners notified when `setUserPlan()` is called
- New functions: `addPlanChangeListener()`, `clearPlanCache()`

#### 3. New Functions in planService.js
- `getCurrentPlan()` - Returns current plan with active status
- `getStaffLimit()` - Returns staff limit based on plan (5 for free/expired, unlimited for active)
- `canAddNewStaff(count)` - Returns whether new staff can be added

#### 4. Screens Now Listen for Plan Changes
- **HomeScreen**: Reloads staff list when plan changes
- **DailyScreen**: Reloads staff list when plan changes  
- **MonthlyScreen**: Reloads staff list when plan changes
- When user upgrades → all staff instantly unlocked

### How Locking Works Now

1. **On App Start**: Check if plan expired, show notification
2. **On Every Action**: 
   - Get current plan via `getCurrentPlan()`
   - If plan is active → all staff unlocked
   - If expired/free → first 5 staff unlocked (by created_at), rest locked
3. **On Plan Change**: All screens auto-reload staff list

### Test Cases to Verify

| Scenario | Expected Behavior |
|----------|------------------|
| Free plan with 6+ staff | Staff 6+ locked, 🔒 shown |
| Monthly plan active | All staff unlocked |
| Plan expires mid-session | Locked staff immediately shown |
| Upgrade from free to monthly | All staff unlocked instantly |
| Add staff when at limit | Blocked, upgrade prompt shown |
| Edit locked staff | Blocked, upgrade prompt shown |
| Mark attendance for locked | Blocked, upgrade prompt shown |
| Delete locked staff | ✅ Allowed |

### Files Modified

- `planService.js` - Added caching, listeners, real-time validation
- `HomeScreen.js` - Added plan change listener
- `DailyScreen.js` - Added plan change listener
- `MonthlyScreen.js` - Added plan change listener
- `StaffDetailScreen.js` - Dynamic lock check
- `EditStaffScreen.js` - Dynamic lock check
- `AddStaffScreen.js` - Uses `canAddStaff()` for validation

### Locking Logic
1. If plan is active → all staff unlocked
2. If expired/free:
   - Sort staff by `created_at` (oldest first)
   - First 5 staff → `isLocked = false`
   - Remaining staff → `isLocked = true`

### UI Indicators
- 🔒 lock icon next to staff name
- Reduced opacity (0.7) for locked staff cards
- Disabled buttons for locked staff
- Lock badge in Staff Detail header

### New Files Created

#### `StaffTracker/src/utils/staffAccessControl.js`
- Core locking logic module
- Functions:
  - `getEffectivePlan()` - Returns effective plan considering expiry
  - `applyStaffLocking(staffList)` - Applies locking to staff list (first 5 unlocked, rest locked)
  - `isStaffLocked(staff)` - Check if staff is locked
  - `canEditStaff()`, `canMarkAttendance()`, `canAddAdvance()` - Permission checks
  - `canDeleteStaff()` - Always returns true (delete allowed)

### Modified Files

#### `StaffTracker/src/services/planService.js`
- Added `isPlanExpired()` - Check if plan has expired
- Added `getPlanStatus()` - Returns comprehensive plan status

#### `StaffTracker/src/utils/upgradeHelper.js`
- Added `showLockedAlert()` - Alert when trying to edit locked staff
- Added `showPlanExpiredAlert()` - Alert on app start if plan expired

#### `StaffTracker/App.js`
- Added plan expiry check on app startup
- Shows notification if plan expired

#### `StaffTracker/src/screens/HomeScreen.js`
- Applied staff locking via `applyStaffLocking()`
- Added 🔒 lock icon for locked staff
- Reduced opacity for locked staff cards

#### `StaffTracker/src/screens/DailyScreen.js`
- Applied staff locking to attendance list
- Disabled attendance marking for locked staff
- Shows lock icon and reduced opacity

#### `StaffTracker/src/screens/MonthlyScreen.js`
- Applied staff locking to staff list

#### `StaffTracker/src/screens/StaffDetailScreen.js`
- Added lock badge in header for locked staff
- Blocked edit button if staff is locked
- Blocked advance adding for locked staff

#### `StaffTracker/src/screens/EditStaffScreen.js`
- Added lock check before saving staff details

### Locking Logic
1. If plan is active → all staff unlocked
2. If expired/free:
   - Sort staff by `created_at` (oldest first)
   - First 5 staff → `isLocked = false`
   - Remaining staff → `isLocked = true`

### UI Indicators
- 🔒 lock icon next to staff name
- Reduced opacity (0.7) for locked staff cards
- Disabled buttons for locked staff

### Edge Cases Handled
- Empty staff list → no locking
- Staff count < 5 → no locking
- Deleted staff → locking recalculated automatically
- Plan upgrade → all staff instantly unlocked
- Added defensive null checks to prevent crashes

---

## Changes Overview

This update introduces a **subscription/upgrade system** for the StaffTracker app, enabling premium plans with unlimited staff members.

---

## New Features

### 1. Subscription Plans (`StaffTracker/src/services/planService.js`)
- Implemented plan management system with four tiers:
  - **Free**: Up to 5 staff members
  - **Monthly**: ₹99/month - Unlimited staff, all premium features
  - **Yearly**: ₹599/year - Save ₹589/year
  - **Lifetime**: ₹999 one-time - All features forever
- Plan data stored locally in `plan_settings.json`
- Functions: `getUserPlan()`, `setUserPlan()`, `isPlanActive()`, `canAddStaff()`, `getPlanDetails()`, `formatExpiryDate()`

### 2. Upgrade Screen (`StaffTracker/src/screens/UpgradeScreen.jsx`) - NEW
- New dedicated screen for plan selection and upgrade
- Displays all available plans with features, pricing, and duration
- Simulates purchase flow (demo mode for future in-app purchase integration)
- Shows current plan indicator
- Reset to Free plan option for non-free users
- Plan limits displayed: Free plan allows max 5 staff members

### 3. Staff Limit Enforcement (`StaffTracker/src/utils/upgradeHelper.js`) - NEW
- Alert displayed when user tries to add staff exceeding their plan limit
- "Upgrade" button navigates to UpgradeScreen
- Helper functions: `showUpgradeAlert()`, `showPlanLimitAlert()`, `resetToFreePlan()`

---

## Modified Files

### `StaffTracker/App.js`
- Added import for `UpgradeScreen`
- Added route `Upgrade` to MainAppStack navigator

### `StaffTracker/src/screens/AddStaffScreen.js`
- Added plan limit check before adding new staff
- Calls `canAddStaff()` to verify if staff can be added based on current plan
- Shows upgrade alert if limit reached

### `StaffTracker/src/screens/ProfileScreen.js`
- Added "Subscription" section in profile
- Displays current plan name, status, and expiry date (if applicable)
- Menu item to navigate to Upgrade screen
- Uses `getPlanDetails()` to fetch plan information
- Shows plan status indicator (green for active, red for expired)

### `StaffTracker/src/database/db.js`
- Modified `exportToJSON()` to include user plan data in exported data
- Added `userPlan` and `planExpiry` to settings object in export

### `StaffTracker/src/services/jsonDataService.js`
- Modified `exportToJSON()` to include user plan data in exported data
- Added `userPlan` and `planExpiry` to settings object in export

---

## Technical Details

### Constants
- `STAFF_LIMIT_FREE = 5` - Maximum staff count for free plan

### Storage
- Plan data saved to: `documentDirectory/plan_settings.json`
- Contains: `{ userPlan: string, planExpiry: string|null }`

### Plan Expiry Logic
- `free` and `lifetime` plans are always active
- `monthly` and `yearly` plans check expiry date against current date

---

## Untracked Files (New)
- `StaffTracker/src/screens/UpgradeScreen.jsx`
- `StaffTracker/src/services/planService.js`
- `StaffTracker/src/utils/upgradeHelper.js`

---

## Notes
- Currently in demo mode - purchases are simulated
- Future integration with in-app purchases (Play Store) required for actual payments
- Export functionality now includes subscription data for data portability