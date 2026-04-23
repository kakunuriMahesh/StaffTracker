# StaffTracker

A comprehensive staff management mobile application built with React Native (Expo). Manage your household staff including maids, cooks, drivers, gardeners, security guards, and more with easy attendance tracking, salary management, and cloud sync capabilities.

## Features

### Core Features
- **Staff Management**: Add, edit, view, and delete staff members
- **Attendance Tracking**: Mark daily attendance (Present, Absent, Leave)
- **Salary Calculation**: Automatic salary calculation based on attendance
- **Advance Payments**: Track and manage advance payments to staff
- **Archive System**: Archive staff members without losing data (WhatsApp-style undo feature)

### Plan System
- **Free Plan**: Up to 5 staff members
- **Monthly Plan**: Up to 50 staff members (₹99/month)
- **Yearly Plan**: Unlimited staff (₹599/year)
- **Lifetime Plan**: Unlimited staff forever (₹999 one-time)

### Cloud Sync
- **Google Sign-In**: Sync data across devices using Google Drive
- **Backup & Restore**: Export and import data in JSON format

### Additional Features
- Role-based staff categories (Maid, Cook, Driver, Gardener, Security, Watchman, Custom)
- Salary types (Daily, Weekly, Monthly)
- Sunday holiday configuration
- Staff notes and important information
- Profile screen with statistics

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: JavaScript
- **Navigation**: React Navigation v7
- **State Management**: React Context + Local Storage
- **Storage**: AsyncStorage + Expo FileSystem
- **Authentication**: Google Sign-In (react-native-google-signin)
- **Calendar**: react-native-calendars
- **Date Handling**: dayjs

## Project Structure

```
StaffTracker/
├── App.js                    # Main app entry with navigation
├── src/
│   ├── components/          # Reusable components
│   │   └── Toast.js         # Toast notification component
│   ├── database/            # Database layer
│   │   └── db.js           # SQLite-like JSON storage
│   ├── screens/            # App screens
│   │   ├── HomeScreen.js           # Main staff list
│   │   ├── AddStaffScreen.js       # Add new staff
│   │   ├── EditStaffScreen.js     # Edit staff details
│   │   ├── StaffDetailScreen.js   # Staff profile & attendance
│   │   ├── DailyScreen.js         # Today's attendance
│   │   ├── MonthlyScreen.js       # Monthly summary
│   │   ├── ProfileScreen.js       # User profile
│   │   ├── ArchiveScreen.js      # Archived staff
│   │   ├── UpgradeScreen.js     # Plan upgrade
│   │   └── SyncSettingsScreen.js # Cloud sync settings
│   ├── services/            # Business logic services
│   │   ├── planService.js        # Plan & limit management
│   │   ├── syncManager.js       # Cloud sync logic
│   │   └── staffReload.js        # Live reload triggers
│   ├── storage/            # Local storage
│   │   └── localStorage.js       # JSON file storage
│   ├── utils/              # Utility functions
│   │   ├── salary.js           # Salary calculation
│   │   ├── staffAccessControl.js # Staff locking logic
│   │   └── upgradeHelper.js   # Upgrade alerts
│   └── database/           # Database functions
│       └── db.js           # All CRUD operations
├── package.json
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   cd StaffTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on Android**
   ```bash
   npm run android
   ```

5. **Run on iOS**
   ```bash
   npm run ios
   ```

## Archive Feature

The app includes a WhatsApp-style archive system:

- **Archive Staff**: Click the Archive button on any staff detail page
- **Undo**: A toast appears for 3 seconds with "Undo" option
- **Automatic Cleanup**: After 3 seconds, attendance records are permanently deleted
- **Archive List**: View all archived staff in the Archive screen
- **Restore**: Restore archived staff anytime from the Archive screen
- **Plan Counting**: Archived staff don't count towards your plan's staff limit

## Plan Limits

| Plan | Staff Limit | Features |
|------|-------------|----------|
| Free | 5 | Basic attendance, local storage |
| Monthly | 50 | All features, cloud sync |
| Yearly | Unlimited | All features, priority support |
| Lifetime | Unlimited | All features forever |

## Data Storage

- **Staff Data**: Stored in local JSON files
- **Attendance**: Date-based attendance records
- **Advances**: Advance payment history
- **Settings**: Plan information and preferences
- **Cloud Backup**: Exported as JSON to Google Drive

## Screen Overview

### Home Screen
- List of all active staff
- Quick attendance status badges with tap-to-update
- Today's date and statistics
- Quick add button
- Archive and sync settings access

### Staff Detail Screen
- Staff profile (name, position, salary)
- Attendance calendar with quick actions
- Monthly summary (present/absent/leave counts)
- Salary breakdown
- Notes section with sorting toggle
- Advance payment management
- Edit and Archive/Delete options

### Daily Screen (Attendance)
- Date picker for selecting attendance date
- Per-staff attendance marking
- Quick status buttons (Present/Absent/Leave)
- Filter by status
- Summary stats

### Monthly Screen
- Staff selector pills
- Filter by period (Monthly/Weekly/Custom)
- Attendance calendar with quick actions
- Salary calculation per staff
- Share payslip feature

### Add/Edit Staff Screen
- Staff information form
- Role selection with custom option
- Salary type (Daily/Weekly/Monthly)
- Calendar date pickers
- KeyboardAvoidingView for smooth input

### Profile Screen
- Staff count statistics
- Current plan information
- Upgrade options
- App settings

## Version History

- **v1.0.0**: Initial release with core features
- **v1.1.0**: UI/UX enhancements and salary type updates

---

# Recent Updates (v1.1.0)

## 1. Bottom Navigation Label Update

**Location**: `App.js`

- Changed tab label from "Today" to "Attendance"
- Icon unchanged for familiar UX

## 2. Keyboard Handling in Staff Form

**Location**: `AddStaffScreen.js`, `EditStaffScreen.js`

- Added `KeyboardAvoidingView` wrapper
- Uses `behavior="padding"` for iOS
- Uses `behavior="height"` for Android
- `keyboardShouldPersistTaps="handled"` for smooth scrolling
- Input fields never hidden behind keyboard

## 3. Calendar Quick Actions (Per-Staff)

**Location**: `StaffDetailScreen.js`, `MonthlyScreen.js`

- Tap on any date in the calendar to show quick action popup
- Options: Present (P), Absent (A), Leave (L), Add Note
- Updates only the selected staff member
- Fast and minimal clicks - no full page navigation
- Respects locked staff

### StaffDetailScreen Changes:
- Added `markAttendance` import
- Added action popup states and handlers
- Calendar `onDayPress` triggers action popup
- Note modal for adding/editing notes

### MonthlyScreen Changes:
- Added weekly salary type support
- Calendar integration with quick actions
- Per-selected-staff updates

## 4. Notes Sorting

**Location**: `StaffDetailScreen.js`

- Notes now sorted in descending order by default (newest first)
- Added sort toggle button (arrow up/down icon)
- Click to toggle between descending and ascending
- Uses `dayjs().valueOf()` for date comparison

### Implementation:
```javascript
const noteSortDesc = useState(true); // default: newest first
const noteDates = Object.keys(attendanceNotes).sort((a, b) => {
  return noteSortDesc 
    ? dayjs(b).valueOf() - dayjs(a).valueOf()
    : dayjs(a).valueOf() - dayjs(b).valueOf();
});
```

## 5. Quick Attendance Update via Status Dot

**Location**: `HomeScreen.js`

- Tap the attendance status dot to quickly mark attendance
- Opens action popup with P/A/L/Note options
- Updates only the selected staff member for today
- Status dot visually updates immediately
- Respects locked staff (disabled tap)

### Features:
- `markAttendance` import added
- `notesMap` state for tracking notes
- `showActionPopup` for quick actions
- `showNoteModal` for adding notes
- Color-coded status badges:
  - Present: Green (#D1FAE5)
  - Absent: Red (#FEE2E2)
  - Leave: Yellow (#FEF3C7)

## 6. Salary Type Updates

**Location**: `AddStaffScreen.js`, `EditStaffScreen.js`, `StaffDetailScreen.js`, `MonthlyScreen.js`, `salary.js`

### Changes:
- **Removed**: Manual/Period-based salary type
- **Added**: Weekly salary type

### Updated Options:
| Old | New |
|-----|-----|
| Daily | Daily |
| Monthly | Weekly |
| Manual | Monthly |

### Salary Calculation Logic:

**In `salary.js`:**
```javascript
if (staff.salary_type === 'daily') {
  paidDays = present;
  grossSalary = present * staff.salary;
} else if (staff.salary_type === 'weekly') {
  paidDays = present + leave;
  grossSalary = (staff.salary / 7) * paidDays;
} else {
  paidDays = present + leave;
  grossSalary = (staff.salary / daysInMonth) * paidDays;
}
```

### UI Updates:
- Label: "Weekly Salary (₹)"
- Hint: "₹X per week"
- Date picker defaults to current week

---

## Summary of Features Added

| Feature | Location | Description |
|---------|----------|-------------|
| Bottom nav label | App.js | "Today" → "Attendance" |
| Keyboard handling | AddStaffScreen.js | KeyboardAvoidingView |
| Calendar quick actions | StaffDetailScreen.js | P/A/L/Note popup |
| Calendar quick actions | MonthlyScreen.js | P/A/L/Note popup |
| Notes sorting | StaffDetailScreen.js | Toggle sort order |
| Status dot tap | HomeScreen.js | Quick attendance |
| Weekly salary | AddStaffScreen.js | New salary type |
| Weekly salary | EditStaffScreen.js | New salary type |
| Weekly salary | salary.js | Calculation |

---

## License

Private - All Rights Reserved

## Support

For issues or questions, please contact the development team.