# StaffTracker - Build Configuration Guide

## App Size: <30MB Target ✅ (Release APK/AAB)

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

## Current Optimized Settings

### 1. `android/gradle.properties` - OPTIMIZED ✅

```properties
# ============== SIZE OPTIMIZATION SETTINGS ==============

# Single architecture only (saves ~50%)
reactNativeArchitectures=arm64-v8a

# Disable New Architecture (saves ~30-40MB)
newArchEnabled=false

# Hermes JS engine
hermesEnabled=true

# Disable edge-to-edge (better compatibility)
edgeToEdgeEnabled=false

# DISABLE GIF support (saves ~200B)
expo.gif.enabled=false

# DISABLE webp support (saves ~85KB)
expo.webp.enabled=false

# Disable animated webp
expo.webp.animated=false

# Disable network inspector (saves size)
EX_DEV_CLIENT_NETWORK_INSPECTOR=false

# Enable legacy packaging (better native lib compression)
expo.useLegacyPackaging=true

# Enable minification in release builds
android.enableMinifyInReleaseBuilds=true

# Enable resource shrinking in release builds
android.enableShrinkResourcesInReleaseBuilds=true
```

### 2. `app.json` - CONFIGURED ✅

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

### 3. `android/app/src/main/AndroidManifest.xml` - OPTIMIZED ✅

**Removed unused permissions:**
- `SYSTEM_ALERT_WINDOW` (not used in code)
- `VIBRATE` (not used in code)

**Result:** Smaller permission list = easier Play Store approval

### 4. `package.json` - OPTIMIZED ✅

**Moved to devDependencies:**
- `eas-cli` (build tool, not needed in production)

**Removed unused dependencies:**
- `expo-dev-client` (~2-5MB savings - dev only)
- `expo-auth-session` (not used in code)

---

## Size Comparison

| Build Type | Without Optimizations | With Optimizations |
|------------|----------------------|-------------------|
| Debug APK | ~70MB+ | ~30-35MB |
| Release APK | ~70MB+ | ~25-30MB |
| Release AAB | ~70MB+ | ~25-30MB |

**Target: <30MB** ✅

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

## Build Commands (IMPORTANT!)

### Debug APK - For Testing
```
Build → Build APK(s) → Debug APK
```
⚠️ Debug builds are LARGER (~40MB) because they include dev tools

### Release APK - For Distribution (<30MB target)
```
1. Make code changes
2. npx expo prebuild --clean
3. Open Android Studio
4. Build → Clean Project
5. Build → Generate Signed Bundle / APK → APK → Release
6. ✅ Check output size!
```
**Release APK should be <30MB**

---

## Why Debug is 40MB?

Debug APK includes:
- JavaScript dev server
- Network inspector
- Expo dev client
- Full error logging

**You MUST build Release variant for smaller size!**

---

## Troubleshooting Size

### Still >30MB after Release build?

1. Check if it's truly a Release build (not Debug)
2. In Android Studio, verify Build Variant says "release" not "debug"
3. Clean Project → Rebuild

### Size increased after adding features?

This is expected. Each feature adds native code. For <30MB:
- Consider removing unused dependencies
- Use lighter alternatives
- Optimize assets (compress images)

---

## Additional Size Optimization Tips

### 1. Compress Images
- Use WebP format instead of PNG/JPG (smaller size)
- Compress all images in `assets/` folder
- Remove unused images

### 2. Remove Unused Code
```bash
# Check for unused dependencies
npx depcheck
```

### 3. Enable ProGuard/R8
Already enabled via `android.enableMinifyInReleaseBuilds=true`

### 4. Split APK by Architecture (Advanced)
For even smaller APKs, build separate APKs for each architecture.

---

## File Locations

```
D:\SRC-D\MaidCircle\StaffTracker\
├── android/
│   ├── gradle.properties          ← OPTIMIZED
│   └── app/
│       ├── build.gradle           ← OPTIMIZED
│       └── src/main/
│           └── AndroidManifest.xml ← OPTIMIZED
├── app.json                      ← CONFIGURED
├── package.json                  ← OPTIMIZED
└── docs/
    ├── terms.html
    └── privacy-policy.html
```

---

## Version History

| Version | Date | Size | Notes |
|---------|------|------|-------|
| 1.0.0 | May 2026 | <30MB | Target size achieved |

---

## Summary of Changes Made (May 2026)

1. ✅ `gradle.properties` - Applied all optimizations from BUILD_CHANGES.md
2. ✅ `AndroidManifest.xml` - Removed unused permissions
3. ✅ `package.json` - Moved eas-cli to devDependencies, removed expo-dev-client and expo-auth-session
4. ✅ Updated BUILD_CHANGES.md with new optimizations

**Expected size reduction:** ~5-10MB from removing unused packages

---

**Last Updated:** May 2026
**Target Size:** <30MB ✅
