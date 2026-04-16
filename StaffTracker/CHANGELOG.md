# Changelog

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