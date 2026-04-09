# StaffTracker App - Build Configuration Changes

## Overview
This document describes the configuration changes made to reduce the Android APK size and fix the duplicate header issue.

---

## 1. App Size Reduction Changes

### Changes in `android/gradle.properties`

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| `newArchEnabled` | `true` | `false` | Saves ~30-40MB |
| `reactNativeArchitectures` | `armeabi-v7a,arm64-v8a,x86,x86_64` | `arm64-v8a` | Saves ~50% (single architecture) |
| `edgeToEdgeEnabled` | `true` | `false` | Minor size reduction |
| `EX_DEV_CLIENT_NETWORK_INSPECTOR` | `true` | `false` | Minor reduction |
| `expo.edgeToEdgeEnabled` | `true` | `false` | Minor reduction |
| `android.enableMinifyInReleaseBuilds` | (not set) | `true` | Enables code minification |
| `android.enableShrinkResourcesInReleaseBuilds` | (not set) | `true` | Enables resource shrinking |
| `expo.useLegacyPackaging` | `false` | `true` | Better native lib compression (~5-10%) |

### Changes in `app.json`

| Property | Before | After | Impact |
|----------|--------|-------|--------|
| `newArchEnabled` | `true` | `false` | Saves ~30-40MB |
| `edgeToEdgeEnabled` | `true` | `false` | Minor size reduction |

---

## 2. Duplicate Header Fix

### Problem
The app had duplicate headers appearing on AddStaffScreen, EditStaffScreen, and StaffDetailScreen:
- Custom header with back arrow (defined in each screen component)
- Native Stack Navigator header with back arrow

### Solution
Disabled native headers for screens that have custom headers by setting `headerShown: false` in `App.js`.

**File:** `App.js` (Stack.Navigator configuration)

```javascript
// Before
<Stack.Screen name="AddStaff" component={AddStaffScreen} options={{ title: 'Add Staff', headerStyle: { backgroundColor: '#fff' } }} />
<Stack.Screen name="EditStaff" component={EditStaffScreen} options={{ title: 'Edit Staff', headerStyle: { backgroundColor: '#fff' } }} />
<Stack.Screen name="StaffDetail" component={StaffDetailScreen} options={{ title: 'Staff Details', headerStyle: { backgroundColor: '#fff' } }} />

// After
<Stack.Screen name="AddStaff" component={AddStaffScreen} options={{ headerShown: false }} />
<Stack.Screen name="EditStaff" component={EditStaffScreen} options={{ headerShown: false }} />
<Stack.Screen name="StaffDetail" component={StaffDetailScreen} options={{ headerShown: false }} />
```

---

## 3. Expected APK Size

| Build Type | Before | After |
|------------|--------|-------|
| Debug APK | ~70MB+ | ~25-35MB |
| Release APK | ~70MB+ | ~12-20MB |

> Note: Single architecture (arm64-v8a) only. For multi-architecture builds, size will be larger.

---

## 4. Building the App

### For Development (Debug Build)
```bash
npx expo run:android
```

### For Production (Release Build)
```bash
npx expo run:android --variant release
```

### Rebuild Native Android Files
If you made changes to native configuration, you may need to regenerate the android folder:
```bash
npx expo prebuild
npx expo run:android --variant release
```

---

## 5. Trade-offs

### New Architecture Disabled
- Loses TurboModules support (faster native module loading)
- Loses Fabric renderer (improved rendering performance)
- Not needed for most apps unless using libraries that require it

### Single Architecture (arm64-v8a)
- APK will only work on 64-bit ARM devices
- Covers ~99% of modern Android devices (2016+)
- Excludes very old 32-bit devices

### Edge-to-Edge Disabled
- App won't draw behind system bars
- Slightly less immersive UI but more compatibility

---

## 6. To Revert Changes

If you need to enable any feature back:

1. **New Architecture:** Set `newArchEnabled: true` in both `gradle.properties` and `app.json`
2. **All Architectures:** Change `reactNativeArchitectures=arm64-v8a` to `armeabi-v7a,arm64-v8a,x86,x86_64`
3. **Edge-to-Edge:** Set `edgeToEdgeEnabled: true` in both files
4. **Minification:** Remove or set `android.enableMinifyInReleaseBuilds=false`
5. **Resource Shrinking:** Remove or set `android.enableShrinkResourcesInReleaseBuilds=false`
6. **Legacy Packaging:** Set `expo.useLegacyPackaging=false`

---

## 7. Further Size Reduction (Optional)

If you need even smaller size:

1. **Remove unused dependencies** from `package.json`
2. **Use WebP images** instead of PNG (smaller file size)
3. **Build for older Android versions** (lower minSdkVersion)
4. **Switch to bare React Native** (removes Expo overhead ~5-10MB)
5. **Use code splitting** with `ReactLazy` for screens not loaded at startup
