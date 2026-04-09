# StaffTracker - Play Store Deployment Guide

## App Information

### Basic Details
- **App Name**: StaffTracker
- **Package Name**: `com.srcdesigns.StaffTracker`
- **Version**: 1.0.0
- **Version Code**: 1
- **Category**: Productivity
- **Content Rating**: Everyone

### Contact Information
- **Developer**: SRC Designs
- **Website**: https://www.stafftracker.app
- **Email**: support@stafftracker.app
- **Privacy Policy URL**: https://www.stafftracker.app/privacy-policy.html
- **Terms of Service URL**: https://www.stafftracker.app/terms-and-conditions.html

---

## Google Play Store Listing

### Short Description (80 characters)
Track household staff attendance, salaries & generate payslips easily.

### Full Description

**StaffTracker - Your Complete Staff Management Solution**

StaffTracker is a powerful and intuitive mobile app designed for households to efficiently manage their domestic staff. Whether you have a maid, cook, driver, gardener, or any other household help, StaffTracker makes it simple to track attendance, calculate salaries, and maintain records.

**Key Features:**

📋 **Staff Management**
- Add and manage staff members with different roles (Maid, Cook, Driver, Gardener, Security, Watchman)
- Store contact information and joining dates
- Track staff salary history

📅 **Attendance Tracking**
- Mark daily attendance as Present, Absent, or Leave
- View attendance calendar for each staff member
- Track attendance patterns over time

💰 **Salary Management**
- Flexible salary types: Weekly, Monthly, or Custom Period
- Automatic salary calculation based on attendance
- Track and manage advance payments
- Generate detailed salary slips

📱 **Easy to Use**
- Clean, intuitive interface
- Works offline - no internet required
- Your data stays private on your device

**Why Choose StaffTracker?**

✅ Simple & Intuitive - No training needed, start using immediately
✅ Privacy First - All data stored locally on your device
✅ Comprehensive - Everything you need for staff management
✅ Regular Updates - We're constantly improving the app

Download StaffTracker today and simplify your household staff management!

---

## App Icons & Graphics

Required assets (in `/assets` folder):
- `icon.png` - 1024x1024px (App icon)
- `adaptive-icon.png` - 1024x1024px (Android adaptive icon foreground)
- `splash-icon.png` - 1284x2778px (Splash screen)
- `favicon.png` - 48x48px (Web favicon)

---

## Legal Documents

### Terms & Conditions
URL: `https://www.stafftracker.app/terms-and-conditions.html`
File: `terms-and-conditions.html`

### Privacy Policy
URL: `https://www.stafftracker.app/privacy-policy.html`
File: `privacy-policy.html`

**IMPORTANT**: Upload these HTML files to your hosting provider (Hostinger) and update the URLs in ProfileScreen.js if different.

---

## Build Commands

### Pre-requisites
1. Node.js 18+ installed
2. Expo CLI: `npm install -g expo-cli`
3. EAS CLI: `npm install -g eas-cli`

### Development Build
```bash
npm install
npx expo start
```

### Android Build (Local)
```bash
npx expo run:android
```

### Production Build with EAS
```bash
# Configure EAS
eas build:configure

# Build for Android (APK for testing)
eas build --platform android --profile preview

# Build for Play Store (AAB for submission)
eas build --platform android --profile production
```

### Manual Build
```bash
# Generate native code
npx expo prebuild --platform android

# Build APK
cd android && ./gradlew assembleRelease
```

---

## Play Store Submission Checklist

### Account Setup
- [ ] Create Google Play Developer account ($25 one-time fee)
- [ ] Set up Google Pay for payments

### App Content
- [ ] Privacy Policy posted and URL verified
- [ ] Terms of Service posted and URL verified
- [ ] All screenshots prepared (Phone, 7" Tablet, 10" Tablet)
- [ ] Feature graphic prepared (1024x500px)
- [ ] App icon (512x512px) prepared

### Store Listing
- [ ] Short description written (≤80 chars)
- [ ] Full description written
- [ ] Category selected: Productivity
- [ ] Content rating questionnaire completed
- [ ] Countries/regions selected for distribution

### Build & Upload
- [ ] AAB file generated
- [ ] App signing key securely stored
- [ ] AAB uploaded to Play Console
- [ ] Release details filled in

### Review & Publish
- [ ] Pricing set (Free or Paid)
- [ ] Ads declaration completed
- [ ] App declared complete
- [ ] Submit for review

---

## Version History

### Version 1.0.0 (Current)
- Initial release
- Staff management (Add, Edit, Delete)
- Daily attendance tracking
- Monthly attendance calendar
- Salary calculation (Weekly, Monthly, Manual)
- Advance payment tracking
- Payslip generation and sharing
- Profile screen with legal links

---

## Support

For issues or questions:
- Email: support@stafftracker.app
- Website: www.stafftracker.app

---

## File Structure

```
StaffTracker/
├── App.js                    # Main app entry
├── app.json                  # Expo configuration
├── package.json               # Dependencies
├── terms-and-conditions.html # Legal document
├── privacy-policy.html        # Legal document
├── android/                   # Android native code
├── assets/                    # Icons and images
└── src/
    ├── database/
    │   └── db.js             # SQLite operations
    ├── screens/
    │   ├── HomeScreen.js
    │   ├── DailyScreen.js
    │   ├── MonthlyScreen.js
    │   ├── AddStaffScreen.js
    │   ├── EditStaffScreen.js
    │   ├── StaffDetailScreen.js
    │   └── ProfileScreen.js
    └── components/
        ├── StaffCard.js
        └── AttendanceDot.js
```

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: SRC Designs
