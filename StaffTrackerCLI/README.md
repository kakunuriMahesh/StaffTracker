# StaffTrackerCLI

A lightweight staff management mobile application built with React Native (CLI). Manage your household staff including maids, cooks, drivers, gardeners, security guards, and more with easy attendance tracking and salary management.

## Features

### Core Features
- **Staff Management**: Add, edit, view, and delete staff members
- **Attendance Tracking**: Mark daily attendance (Present, Absent, Leave)
- **Salary Calculation**: Automatic monthly salary calculation based on attendance
- **Advance Payments**: Track and manage advance payments to staff
- **Archive System**: Archive staff members without losing data (WhatsApp-style undo feature)

### Plan System
- **Free Plan**: Up to 5 staff members
- **Monthly Plan**: Up to 50 staff members
- **Premium/Lifetime Plan**: Unlimited staff members

### Additional Features
- Role-based staff categories (Maid, Cook, Driver, Gardener, Security, Watchman, Custom)
- Custom salary types (Daily, Monthly)
- Staff notes
- Profile screen with statistics

## Tech Stack

- **Framework**: React Native CLI 0.73
- **Language**: JavaScript
- **Navigation**: React Navigation v6
- **State Management**: React Context + AsyncStorage
- **Storage**: AsyncStorage
- **Icons**: react-native-vector-icons (Ionicons)
- **Date Handling**: Native JavaScript

## Project Structure

```
StaffTrackerCLI/
├── App.js                    # Main app entry
├── src/
│   ├── components/          # Reusable components
│   │   └── Toast.js        # Toast notification component
│   ├── context/            # State management
│   │   └── AppContext.js   # Global app state
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.js # Stack & Tab navigators
│   ├── screens/            # App screens
│   │   ├── HomeScreen.js           # Main staff list
│   │   ├── AddStaffScreen.js       # Add new staff
│   │   ├── EditStaffScreen.js     # Edit staff details
│   │   ├── StaffDetailScreen.js   # Staff profile & attendance
│   │   ├── DailyScreen.js         # Today's attendance
│   │   ├── MonthlyScreen.js       # Monthly summary
│   │   ├── ProfileScreen.js       # User profile
│   │   ├── ArchiveScreen.js      # Archived staff
│   │   ├── PlansScreen.js        # Plan upgrade
│   │   └── SyncSettingsScreen.js # Sync settings
│   └── services/            # Services
│       ├── storageService.js    # AsyncStorage operations
│       └── staffReload.js       # Live reload triggers
├── package.json
├── index.js
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   cd StaffTrackerCLI
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

## Archive Feature

The app includes a WhatsApp-style archive system:

- **Archive Staff**: Click the Archive button on any staff detail page
- **Undo**: A toast appears with "Undo" option
- **Archive List**: View all archived staff in the Archive screen
- **Restore**: Restore archived staff anytime from the Archive screen
- **Plan Counting**: Archived staff don't count towards your plan's staff limit

## Plan Limits

| Plan | Staff Limit | Features |
|------|-------------|----------|
| Free | 5 | Basic attendance, local storage |
| Monthly | 50 | All features |
| Premium | Unlimited | All features forever |

## Data Storage

- **Staff Data**: Stored in AsyncStorage
- **Attendance**: Date-based attendance records in AsyncStorage
- **Advances**: Advance payment history in AsyncStorage
- **Settings**: Plan information and preferences in AsyncStorage

## Screen Overview

### Home Screen
- List of all active staff
- Today's attendance status badges
- Quick add button
- Archive access button

### Staff Detail Screen
- Staff profile (name, position, salary)
- Attendance calendar with marks
- Monthly summary (present/absent/leave counts)
- Salary breakdown
- Advance payment management
- Edit and Archive/Delete options

### Daily Screen
- Bulk attendance marking for today
- Quick status buttons (Present/Absent/Leave)

### Monthly Screen
- Monthly attendance summary
- Salary calculation per staff

### Profile Screen
- Staff count statistics
- Current plan information
- Upgrade options
- App settings

## Plan Upgrade Options

- **Free**: 5 staff members
- **Monthly**: 50 staff members (₹99/month)
- **Premium**: Unlimited staff (₹999 one-time)
- **Lifetime**: Unlimited + all future features (₹1999 one-time)

## Version History

- **v0.0.1**: Initial release with core features

## Differences from StaffTracker

| Feature | StaffTracker | StaffTrackerCLI |
|---------|--------------|-----------------|
| Framework | Expo SDK 54 | React Native CLI |
| Storage | FileSystem + SQLite | AsyncStorage |
| Cloud Sync | Google Drive | Not available |
| Authentication | Google Sign-In | Not available |
| Architecture | Full-featured | Lightweight |

## License

Private - All Rights Reserved

## Support

For issues or questions, please contact the development team.