# StaffTracker

A mobile application for managing household staff, tracking attendance, and calculating salary payments. Built with Expo (React Native) and SQLite.

## Features

- **Staff Management**: Add, edit, and delete staff members with roles (Maid, Cook, Driver, Gardener, Security, Watchman)
- **Daily Attendance**: Mark daily attendance as Present, Absent, or Leave
- **Monthly Summary**: View attendance calendar and salary calculations per staff
- **Salary Calculation**: Automatic salary pro-rata based on attendance
- **Advance Payments**: Record and track advance payments to staff
- **Payslip Export**: Generate and share salary slips as PDF

## Tech Stack

- **Framework**: Expo SDK 54 (React Native 0.81)
- **Navigation**: React Navigation 7 (Bottom Tabs + Native Stack)
- **Database**: expo-sqlite (local SQLite storage)
- **UI**: Ionicons, react-native-calendars, dayjs
- **Utils**: expo-print & expo-sharing for PDF generation

## Installation

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## App Structure

```
StaffTracker/
├── App.js                 # Main app with navigation setup
├── src/
│   ├── database/
│   │   └── db.js          # SQLite database operations
│   ├── screens/
│   │   ├── HomeScreen.js          # Staff list (tab 1)
│   │   ├── DailyScreen.js     # Today's attendance (tab 2)
│   │   ├── MonthlyScreen.js   # Monthly view (tab 3)
│   │   ├── AddStaffScreen.js   # Add new staff
│   │   ├── EditStaffScreen.js # Edit staff
│   │   └── StaffDetailScreen.js # Staff details + attendance
│   ├── components/
│   │   ├── StaffCard.js
│   │   └── AttendanceDot.js
│   └── utils/
│       └── salary.js      # Salary calculation
```

## Database Schema

### staff
| Column | Type | Description |
|--------|------|--------------|
| id | INTEGER | Primary key |
| name | TEXT | Staff name |
| position | TEXT | Role (Maid, Cook, etc.) |
| salary | REAL | Salary amount |
| salary_type | TEXT | weekly/monthly/manual |
| phone | TEXT | Contact number |
| join_date | TEXT | Join date (YYYY-MM-DD) |

### attendance
| Column | Type | Description |
|--------|------|--------------|
| id | INTEGER | Primary key |
| staff_id | INTEGER | Foreign key to staff |
| date | TEXT | Date (YYYY-MM-DD) |
| status | TEXT | P (Present), A (Absent), L (Leave) |

### advances
| Column | Type | Description |
|--------|------|--------------|
| id | INTEGER | Primary key |
| staff_id | INTEGER | Foreign key to staff |
| amount | REAL | Advance amount |
| date | TEXT | Date (YYYY-MM-DD) |
| note | TEXT | Optional note |

## Usage

1. **Add Staff**: Go to Staff tab → Tap "Add" button → Fill details → Save
2. **Mark Attendance**: Go to Today tab → Tap P/A/L buttons for each staff
3. **View Monthly**: Go to Monthly tab → Select staff → View calendar and salary breakdown
4. **Add Advance**: Open staff detail → Tap "Add Advance" → Enter amount and date
5. **Share Payslip**: In Monthly tab → Tap "Share Payslip" → Choose app to share

## Screenshots

The app has three main tabs:
- **Staff**: List of all staff with today's attendance status
- **Today**: Mark and view today's attendance
- **Monthly**: Calendar view with salary calculations

## License

MIT