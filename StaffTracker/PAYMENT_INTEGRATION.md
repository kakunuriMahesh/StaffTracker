# Payment Integration Documentation

## What Was Changed

**Date:** May 2026  
**File Modified:** `src/screens/UpgradeScreen.jsx`

### Changes Made:
1. **Removed demo payment simulation**
   - Deleted `simulatePurchase()` function entirely
   - Removed `loading` state (no longer needed)
   - Removed `ActivityIndicator` import and usage

2. **Disabled paid plan upgrades**
   - Added `type: 'free'` or `type: 'paid'` to all plan objects
   - Modified `handleUpgrade()` function to intercept paid plan selections
   - Paid plans now show "Coming Soon" alert instead of processing payment

3. **Cleaned up imports**
   - Removed `dayjs` import (no longer needed)
   - Removed `setUserPlan`, `PLAN_TYPES`, `PLAN_PRICES`, `PLAN_LABELS` imports from planService
   - Removed `ActivityIndicator` from react-native import

## Why These Changes Were Made

- **Waiting for real Google Play Billing integration**
- Current app uses demo/fake payment flow which is not suitable for production
- Google Play Console requires real in-app purchases (IAP) for paid features
- Prevents users from accidentally "unlocking" premium features without payment
- Ensures compliance with Play Store policies (no fake payment flows)

## Current Behavior

### Free Plan:
- ✅ Works normally
- ✅ Shows "Current Plan" alert when selected
- ✅ No changes to existing functionality

### Paid Plans (Monthly, Yearly, Lifetime):
- ❌ **No payment processing**
- ❌ **No plan unlocking**
- ❌ **No state changes**
- ❌ **No navigation changes**
- ❌ **No storage updates**
- ✅ Shows "Coming Soon" alert with message:
  ```
  Title: "Coming Soon"
  Message: "Premium plans will be available in the next update. Stay tuned!"
  Button: "OK" (dismisses alert, nothing else)
  ```
- ✅ User remains on Free plan

### Code Logic:
```javascript
const handleUpgrade = (planId) => {
  if (planId === 'free') {
    Alert.alert('Current Plan', 'You are already on the Free plan.');
    return;
  }

  const selectedPlan = PLANS.find(p => p.id === planId);
  if (!selectedPlan) return;

  // TODO: Integrate Google Play Billing here using react-native-iap in future update
  if (selectedPlan.type !== 'free') {
    Alert.alert(
      'Coming Soon',
      'Premium plans will be available in the next update. Stay tuned!',
      [{ text: 'OK' }]
    );
    return; // Early return - no side effects
  }
};
```

## Future Tasks (Checklist)

### 1. Integrate react-native-iap
- [ ] Install package: `npm install react-native-iap`
- [ ] Configure for Expo: `npx expo install react-native-iap`
- [ ] Add to `app.json` plugins section
- [ ] Create `src/services/iapService.js` for IAP handling

### 2. Create Products in Google Play Console
- [ ] Set up Merchant Account (Payment Profile)
- [ ] Create product IDs following naming convention:
  - `stafftracker_sub_monthly` (₹99/month)
  - `stafftracker_sub_yearly` (₹599/year)
  - `stafftracker_sub_lifetime` (₹999 one-time)
- [ ] Configure subscription details (grace period, free trial, etc.)
- [ ] Publish products (24-48 hour approval)

### 3. Handle Purchase Success
- [ ] Set up `purchaseUpdatedListener`
- [ ] Process successful purchases
- [ ] Call `finishTransaction()` after successful validation
- [ ] Update local plan storage via `planService.setUserPlan()`
- [ ] Consider server-side validation with Google Play Developer API

### 4. Restore Purchases on App Start
- [ ] Add "Restore Purchases" button in Upgrade screen
- [ ] Implement `getAvailablePurchases()` on app launch
- [ ] Handle restored transactions
- [ ] Update UI based on restored plan

### 5. Validate Subscription Status
- [ ] Check subscription expiry on app launch
- [ ] Handle expired subscriptions (downgrade to Free)
- [ ] Implement server-side receipt validation
- [ ] Set up webhook for subscription lifecycle events (renewal, cancellation, etc.)

## Notes for Developer

### ⚠️ Critical Rules:

1. **Do NOT fake payment success**
   - Never simulate a successful purchase without real Google Play Billing
   - Never set `userPlan` to paid plans without valid purchase token
   - Users must go through actual Play Store payment flow

2. **Always verify purchases via Play Billing**
   - Use `react-native-iap` for all purchase flows
   - Validate purchase tokens on your server
   - Use Google Play Developer API for server-side validation
   - Never trust client-side only validation

3. **Subscription Management**
   - Subscriptions auto-renew unless cancelled by user
   - Always check expiry date before granting premium access
   - Handle grace periods and account holds properly
   - Provide clear cancellation instructions in app

4. **Testing**
   - Use Google Play License Testing accounts for testing
   - Test with test card: "Test card, always approves"
   - Test real cards on Internal Testing track
   - Test all scenarios: purchase, renewal, cancellation, restoration

5. **Error Handling**
   - Handle network errors gracefully
   - Show user-friendly error messages
   - Log errors for debugging (but never log sensitive data)
   - Provide support contact for payment issues

## Code TODOs

Current TODO in `UpgradeScreen.jsx` line 71:
```javascript
// TODO: Integrate Google Play Billing here using react-native-iap in future update
```

When implementing, replace the "Coming Soon" alert with:
```javascript
try {
  await IAPService.initialize();
  await IAPService.purchaseProduct(planId);
  // Purchase flow continues in purchaseUpdatedListener
} catch (error) {
  Alert.alert('Purchase Failed', error.message);
}
```

## References

- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [react-native-iap Documentation](https://github.com/dooboolab-community/react-native-iap)
- [Google Play Console](https://play.google.com/console)
- See also: `GOOGLE_PLAY_IAP_SETUP.md` for complete integration guide

---

**Last Updated:** May 2026  
**Status:** Awaiting Google Play Billing Integration  
**Maintainer:** StaffTracker Team
