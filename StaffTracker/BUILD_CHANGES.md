# StaffTracker - Build Configuration Guide

## App Size: 28MB ✅ (Release APK)

---

## 🚀 Quick Start Workflow

Every time you make code changes and want to build:

### Option A: Android Studio (Recommended)

```
1. Make code changes in VS Code
2. Run: npx expo prebuild --clean (if native changes made)
3. Open android folder in Android Studio
4. Ctrl+Shift+O → Sync Gradle
5. Build → Build APK(s) → Debug APK
   OR
   Build → Generate Signed Bundle / APK → Release → AAB/APK
6. ✅ Done!
```

### Option B: Expo Terminal

```
1. Make code changes in VS Code
2. Run: npx expo prebuild --clean
3. Run: npx expo run:android
```

---

## ⚠️ IMPORTANT: Settings Reset After Prebuild

**Every time you run `npx expo prebuild`, these files get reset:**

- `android/gradle.properties`
- `android/app/build.gradle`
- `android/app/src/main/AndroidManifest.xml`

**You MUST re-apply the optimizations below after each prebuild!**

---

## Settings to Apply After Prebuild

### 1. `android/gradle.properties`

**File Location:** `D:\SRC-D\MaidCircle\StaffTracker\android\gradle.properties`

**Changes to make (line by line):**

```properties
# Line ~31: Change architectures to SINGLE (saves ~50%)
# BEFORE: reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
# AFTER:
reactNativeArchitectures=arm64-v8a

# Line ~38: Disable New Architecture (saves ~30-40MB)
# BEFORE: newArchEnabled=true
# AFTER:
newArchEnabled=false

# Line ~58: Disable network inspector
# BEFORE: EX_DEV_CLIENT_NETWORK_INSPECTOR=true
# AFTER:
EX_DEV_CLIENT_NETWORK_INSPECTOR=false

# Line ~61: Enable legacy packaging for better compression
# BEFORE: expo.useLegacyPackaging=false
# AFTER:
expo.useLegacyPackaging=true

# Line ~47 (enable edge-to-edge - optional, keep false):
edgeToEdgeEnabled=false

# DISABLE GIF support (saves ~200B)
expo.gif.enabled=false

# DISABLE webp support (saves ~85KB)
expo.webp.enabled=false

# ADD at the end of file - Enable minification
android.enableMinifyInReleaseBuilds=true

# ADD at the end of file - Enable resource shrinking
android.enableShrinkResourcesInReleaseBuilds=true
```

### 2. `app.json`

**File Location:** `D:\SRC-D\MaidCircle\StaffTracker\app.json`

**Changes:**

```json
{
  "expo": {
    "android": {
      "newArchEnabled": false,
      "edgeToEdgeEnabled": false
    }
  }
}
```

---

## Complete Settings Reference

### `android/gradle.properties` - Full Optimized Version

```properties
# Project-wide Gradle settings.

org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true
android.useAndroidX=true
android.enablePngCrunchInReleaseBuilds=true

# ============== SIZE OPTIMIZATION SETTINGS ==============

# Single architecture only (saves ~50%)
reactNativeArchitectures=arm64-v8a

# Disable New Architecture (saves ~30-40MB)
newArchEnabled=false

# Hermes JS engine
hermesEnabled=true

# Disable edge-to-edge (better compatibility)
edgeToEdgeEnabled=false

# Disable GIF support
expo.gif.enabled=false

# Disable webp support
expo.webp.enabled=false

# Disable animated webp
expo.webp.animated=false

# Disable network inspector
EX_DEV_CLIENT_NETWORK_INSPECTOR=false

# Enable legacy packaging (better native lib compression)
expo.useLegacyPackaging=true

# Enable minification in release builds
android.enableMinifyInReleaseBuilds=true

# Enable resource shrinking in release builds
android.enableShrinkResourcesInReleaseBuilds=true
```

---

## Size Comparison

| Build Type | Without Optimizations | With Optimizations |
|------------|----------------------|-------------------|
| Debug APK | ~70MB+ | ~30-40MB |
| Release APK | ~70MB+ | ~25-35MB |
| Release AAB | ~70MB+ | ~25-30MB |

**Current App Size: 28MB** ✅

---

## Architecture Notes

### arm64-v8a Only

- ✅ Works on ~99% of modern Android devices (2016+)
- ✅ 64-bit ARM processors
- ❌ Does NOT work on very old 32-bit devices

### New Architecture Disabled

- ✅ Smaller app size (~30-40MB savings)
- ✅ Better compatibility
- ❌ Loses TurboModules support
- ❌ Loses Fabric renderer

---

## Troubleshooting

### Issue: "Gradle sync failed"

**Fix:**
1. Close Android Studio
2. Delete `android/.gradle` folder
3. Delete `android/app/build` folder
4. Delete `android/build` folder
5. Reopen Android Studio
6. Ctrl+Shift+O to sync

### Issue: "Kotlin not found"

**Fix:**
1. File → Project Structure
2. Modules → select app
3. Dependencies → Set Kotlin version
4. Apply and OK

### Issue: App size still large after optimizations

**Check:**
1. Did you sync after editing gradle.properties? (Ctrl+Shift+O)
2. Did you clean build? (Build → Clean Project)
3. Did you build release variant? (not debug)

### Issue: "Cannot find symbol" after prebuild

**Fix:**
1. Run `npx expo prebuild --clean`
2. Re-apply all gradle.properties changes
3. Sync and rebuild

---

## Play Store Submission Checklist

### Pre-Build
- [x] Apply optimization settings
- [x] Test on device (debug APK)
- [x] Verify all features work

### Build AAB
- [x] Generate signing key (one-time)
- [x] Build → Generate Signed Bundle → Android App Bundle
- [x] Select `release` variant
- [x] Sign with your keystore

### Upload to Play Console
- [ ] Create Play Console account ($25 one-time)
- [ ] Create new app
- [ ] Fill store listing (title, description, screenshots)
- [ ] Upload AAB file
- [ ] Set pricing (Free or Paid)
- [ ] Complete content rating questionnaire
- [ ] Submit for review

---

## File Locations

```
D:\SRC-D\MaidCircle\StaffTracker\
├── android/
│   ├── gradle.properties          ← Edit this after prebuild
│   └── app/
│       └── build.gradle
├── app.json                      ← Edit this after prebuild
├── terms-and-conditions.html     ← Legal page
├── privacy-policy.html           ← Legal page
└── src/
    └── screens/
```

---

## Version History

| Version | Date | Size | Notes |
|---------|------|------|-------|
| 1.0.0 | Jan 2025 | 28MB | Initial release |

---

**Last Updated:** January 2025
**Current Size:** 28MB ✅
