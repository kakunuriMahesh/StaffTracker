# Google Play In-App Purchase Integration Guide

## 📋 Table of Contents
1. [Current Demo Mode Analysis](#current-demo-mode-analysis)
2. [Google Play Console Setup](#google-play-console-setup)
3. [Payment Profile Configuration](#payment-profile-configuration)
4. [App Integration Steps](#app-integration-steps)
5. [Industry Standards & Best Practices](#industry-standards--best-practices)
6. [Testing Checklist](#testing-checklist)

---

## Current Demo Mode Analysis

### How Demo Mode Works (Current Implementation)

**File:** `src/screens/UpgradeScreen.jsx`

```javascript
// Current flow:
1. User taps "Upgrade Now" → handleUpgrade(planId)
2. Shows alert with "Simulate Purchase" option
3. simulatePurchase(planId) → sets plan locally via planService
4. planService stores plan in local JSON file (plan_settings.json)
```

**File:** `src/services/planService.js`

```javascript
// Current storage method:
- Local file: documentDirectory + 'plan_settings.json'
- Stores: { userPlan, planExpiry, originalPlan, lastUpdated }
- No server validation
- No real payment processing
```

### Plan Structure (Current)

| Plan ID | Price (₹) | Duration | Expiry Type |
|---------|-----------|----------|-------------|
| free | 0 | Forever | None |
| monthly | 99 | /month | +1 month |
| yearly | 599 | /year | +1 year |
| lifetime | 999 | one-time | 'lifetime' |

---

## Google Play Console Setup

### Step 1: Create Google Play Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your Google account
3. Accept Developer Distribution Agreement
4. Pay one-time $25 registration fee
5. Verify identity (government ID required)

### Step 2: Create App Entry

```
Play Console → Create App
├── App Name: StaffTracker
├── Default Language: English (United States)
├── App or Game: App
├── Free or Paid: Free (IAP handled separately)
└── Restricted Content: No
```

### Step 3: Set Up Merchant Account (Payment Profile)

**⚠️ Critical: Complete this BEFORE creating in-app products**

```
Play Console → Setup → Payments Profile
```

#### Payment Profile Configuration (Industry Standard)

**Business Information:**
```
Account Type: Business (recommended) or Individual
├── Business Name: [Your Registered Business Name]
├── Business Address: [Complete physical address]
├── Tax ID/VAT: [Your tax identification number]
├── Phone: [Valid contact number]
└── Email: [Business email address]
```

**Important Notes:**
- Use real business information (verified by Google)
- Address must match bank account for payout
- Changes require re-verification (delay: 2-5 days)

#### Payout Settings

```
Payments Profile → Payout Settings
```

**Supported Payout Methods:**
| Method | Region | Processing Time |
|--------|--------|-----------------|
| Bank Transfer (ACH/SEPA) | Global | 3-7 business days |
| Wire Transfer | Global | 1-3 business days |
| PayPal | Select countries | 1-2 business days |

**Industry Best Practice:**
- Use business bank account (not personal)
- Ensure account name matches business name
- Maintain minimum $1 USD equivalent balance for verification

---

## Creating In-App Products

### Step 1: Set Up In-App Products in Play Console

```
Play Console → Your App → Monetize → Products → In-app products
```

### Step 2: Define Product IDs (Follow Naming Convention)

**Industry Standard Naming Convention:**
```
Format: <app_prefix>_<product_type>_<duration/billing>
Example: stafftracker_sub_monthly
```

**Create These Products:**

| Product ID | Name | Type | Price (₹) | Billing Period |
|------------|------|------|-----------|----------------|
| `stafftracker_sub_monthly` | Monthly Premium | Subscription | 99 | Monthly |
| `stafftracker_sub_yearly` | Yearly Premium | Subscription | 599 | Yearly |
| `stafftracker_sub_lifetime` | Lifetime Access | One-time | 999 | One-time |

### Step 3: Configure Subscription Details

**For Monthly/Yearly Subscriptions:**

```
Product Details:
├── Title: "StaffTracker Premium - Monthly"
├── Description: "Unlock unlimited staff management with premium features"
├── Price: ₹99 (monthly) / ₹599 (yearly)
├── Billing Period: Monthly / Yearly
├── Free Trial: 7 days (recommended for conversion)
├── Grace Period: 3 days (industry standard)
└── Account Hold: 30 days (recovery window)
```

**Subscription Features (Displayed to Users):**
```
✓ Up to 50 staff members (Monthly) / Unlimited (Yearly)
✓ All premium features
✓ Priority support
✓ No ads
✓ Cross-device sync
```

### Step 4: Configure One-Time Product (Lifetime)

```
Product ID: stafftracker_sub_lifetime
├── Title: "StaffTracker Lifetime Access"
├── Description: "One-time purchase for lifetime premium access"
├── Price: ₹999
├── Consumable: No (non-consumable)
└── Region: All available regions
```

---

## App Integration Steps

### Step 1: Install Required Package

```bash
cd D:\SRC-D\MaidCircle\StaffTracker
npm install react-native-iap
# or for Expo managed workflow:
npx expo install expo-in-app-purchases
```

**Note:** Since you're using Expo with prebuild, use `react-native-iap` for better subscription support.

### Step 2: Update app.json for IAP Support

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-iap",
        {
          "android": {
            "items": [
              "stafftracker_sub_monthly",
              "stafftracker_sub_yearly",
              "stafftracker_sub_lifetime"
            ]
          }
        }
      ]
    ]
  }
}
```

### Step 3: Create IAP Service (New File)

**File:** `src/services/iapService.js`

```javascript
import * as RNIap from 'react-native-iap';

const {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestSubscription,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
} = RNIap;

const ANDROID_ITEM_IDS = {
  monthly: 'stafftracker_sub_monthly',
  yearly: 'stafftracker_sub_yearly',
  lifetime: 'stafftracker_sub_lifetime',
};

export class IAPService {
  static async initialize() {
    try {
      await initConnection();
      console.log('[IAPService] Initialized');
      return true;
    } catch (error) {
      console.error('[IAPService] Init error:', error);
      return false;
    }
  }

  static async getProducts() {
    try {
      const products = await getProducts({
        skus: Object.values(ANDROID_ITEM_IDS),
      });
      return products;
    } catch (error) {
      console.error('[IAPService] Get products error:', error);
      return [];
    }
  }

  static async purchaseProduct(planId) {
    try {
      const sku = ANDROID_ITEM_IDS[planId];
      if (!sku) throw new Error('Invalid plan ID');

      if (planId === 'lifetime') {
        // One-time purchase
        await requestPurchase({ sku });
      } else {
        // Subscription
        await requestSubscription({ sku });
      }
      return true;
    } catch (error) {
      console.error('[IAPService] Purchase error:', error);
      throw error;
    }
  }

  static setupPurchaseListener(onPurchase, onError) {
    const purchaseSubscription = purchaseUpdatedListener((purchase) => {
      console.log('[IAPService] Purchase updated:', purchase);
      onPurchase(purchase);
    });

    const errorSubscription = purchaseErrorListener((error) => {
      console.error('[IAPService] Purchase error:', error);
      onError(error);
    });

    return () => {
      purchaseSubscription.remove();
      errorSubscription.remove();
    };
  }

  static async endConnection() {
    await endConnection();
  }
}
```

### Step 4: Update UpgradeScreen.jsx for Real IAP

**Modified `handleUpgrade` function:**

```javascript
const handleUpgrade = async (planId) => {
  if (planId === 'free') {
    Alert.alert('Current Plan', 'You are already on the Free plan.');
    return;
  }

  const selectedPlan = PLANS.find(p => p.id === planId);
  if (!selectedPlan) return;

  setLoading(true);
  try {
    // Initialize IAP connection
    await IAPService.initialize();
    
    // Attempt real purchase
    await IAPService.purchaseProduct(planId);
    
    // Purchase flow continues in listener (see below)
  } catch (error) {
    console.error('[UpgradeScreen] Purchase error:', error);
    Alert.alert('Purchase Failed', error.message || 'Please try again.');
    setLoading(false);
  }
};
```

**Add purchase listener in useEffect:**

```javascript
useEffect(() => {
  loadCurrentPlan();

  // Setup IAP listener
  const cleanup = IAPService.setupPurchaseListener(
    async (purchase) => {
      // Handle successful purchase
      if (purchase) {
        await handlePurchaseSuccess(purchase);
      }
    },
    (error) => {
      console.error('[UpgradeScreen] IAP Error:', error);
      setLoading(false);
    }
  );

  return () => {
    cleanup();
    IAPService.endConnection();
  };
}, []);
```

**Handle purchase success:**

```javascript
const handlePurchaseSuccess = async (purchase) => {
  try {
    // Extract plan from purchase
    const sku = purchase.productId;
    let planId = 'monthly'; // default
    
    if (sku.includes('yearly')) planId = 'yearly';
    else if (sku.includes('lifetime')) planId = 'lifetime';

    // Calculate expiry
    let expiryDate = null;
    if (planId === 'monthly') {
      expiryDate = dayjs().add(1, 'month').toISOString();
    } else if (planId === 'yearly') {
      expiryDate = dayjs().add(1, 'year').toISOString();
    } else if (planId === 'lifetime') {
      expiryDate = 'lifetime';
    }

    // Update local plan (consider server validation too)
    const success = await setUserPlan(planId, expiryDate);
    
    if (success) {
      // Finish transaction (IMPORTANT!)
      await RNIap.finishTransaction(purchase);
      
      Alert.alert(
        'Success!',
        `You have been upgraded to ${PLAN_LABELS[planId]} plan.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  } catch (error) {
    console.error('[UpgradeScreen] Handle success error:', error);
    Alert.alert('Error', 'Failed to activate plan. Please contact support.');
  } finally {
    setLoading(false);
  }
};
```

---

## Industry Standards & Best Practices

### 1. Server-Side Validation (Recommended for Production)

**Why:** Client-side validation can be bypassed.

**Implementation:**
```
1. Your server receives purchase token from app
2. Server validates with Google Play Developer API
3. Server updates user's plan in database
4. App syncs with server on launch
```

**Google Play Developer API Endpoint:**
```
POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}:acknowledge
```

### 2. Security Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Obfuscate code | Enable R8/proguard | High |
| Validate receipts | Server-side validation | Critical |
| Use nonce | Prevent replay attacks | Medium |
| Encrypt local storage | Protect plan_settings.json | Medium |
| Certificate pinning | Secure API calls | High |

### 3. Subscription Lifecycle Management

```
User Flow:
Sign Up → Free Trial (optional) → Active → Cancellation → Grace Period → Account Hold → Expired

App Handling:
1. Check subscription status on app launch
2. Handle grace period (allow access)
3. Handle account hold (limit features)
4. Restore purchases on reinstall
```

### 4. Restore Purchases (Required by Google)

**Add restore button in settings/upgrade screen:**

```javascript
const handleRestorePurchases = async () => {
  try {
    setLoading(true);
    const purchases = await RNIap.getAvailablePurchases();
    
    if (purchases.length === 0) {
      Alert.alert('No Purchases', 'No previous purchases found.');
      return;
    }

    // Process restored purchases
    for (const purchase of purchases) {
      await handlePurchaseSuccess(purchase);
    }
  } catch (error) {
    Alert.alert('Restore Failed', error.message);
  } finally {
    setLoading(false);
  }
};
```

### 5. Error Handling & User Communication

**Common Errors & Messages:**

| Error Code | User Message | Action |
|------------|--------------|--------|
| USER_CANCELED | "Purchase was cancelled" | None |
| ITEM_ALREADY_OWNED | "You already own this item" | Restore purchases |
| ITEM_UNAVAILABLE | "Item not available in your region" | Contact support |
| SERVICE_DISCONNECTED | "Play Store connection lost" | Retry |
| BILLING_UNAVAILABLE | "Billing not available" | Check Play Store |

---

## Testing Checklist

### Pre-Launch Testing

- [ ] **Test Card (Google Play Console)**
  ```
  Play Console → Setup → License Testing
  Add test email accounts
  Use test card: "Test card, always approves"
  ```

- [ ] **Real Card Testing (Internal Track)**
  ```
  Upload to Internal Testing track
  Add up to 100 testers
  Use real cards (refunds available)
  ```

- [ ] **Test Scenarios**
  - [ ] New subscription purchase
  - [ ] Subscription renewal
  - [ ] Subscription cancellation
  - [ ] Subscription reinstatement
  - [ ] Grace period handling
  - [ ] Account hold period
  - [ ] Restore purchases
  - [ ] Multiple device sync

### Production Launch Checklist

- [ ] Payment profile verified
- [ ] Bank account linked and verified
- [ ] All tax information submitted
- [ ] Products approved by Google (24-48 hours)
- [ ] Privacy policy updated with refund policy
- [ ] Customer support email setup
- [ ] Server-side validation implemented
- [ ] Error tracking (Sentry/Crashlytics) enabled
- [ ] Analytics for conversion tracking

---

## Pricing Strategy (Industry Standards)

### Recommended Pricing Structure

| Plan | Price (₹) | USD Equivalent | Target Market |
|------|-----------|----------------|---------------|
| Monthly | 99 | ~$1.20 | Trial users |
| Yearly | 599 | ~$7.20 | Committed users (Save 50%) |
| Lifetime | 999 | ~$12 | Power users |

### Conversion Optimization Tips

1. **Free Trial:** Offer 7-day free trial (increases conversion by 30-40%)
2. **Yearly Discount:** Show savings clearly (e.g., "Save ₹589/year")
3. **Lifetime Offer:** Limited-time pricing creates urgency
4. **Upgrade Prompt:** Show when user reaches staff limit (5)

---

## Legal & Compliance

### Required Policies (Google Play Requirements)

1. **Privacy Policy**
   - Must be accessible from app
   - Include data collection practices
   - Include payment data handling

2. **Refund Policy**
   - Clearly state refund terms
   - Google Play's 48-hour refund window
   - Your extended refund policy (if any)

3. **Subscription Terms**
   - Auto-renewal disclosure
   - Cancellation instructions
   - Price change notifications

### Sample Refund Policy Text

```html
<h2>Refund Policy</h2>
<p>Subscriptions automatically renew unless cancelled. You can cancel anytime in Google Play Store.</p>
<p>Refunds within 48 hours: Use Google Play's refund button.</p>
<p>Refunds after 48 hours: Contact support@yourdomain.com with reason.</p>
<p>Lifetime purchases: 7-day no-questions-asked refund.</p>
```

---

## File Structure After Integration

```
StaffTracker/
├── src/
│   ├── screens/
│   │   └── UpgradeScreen.jsx (updated with IAP)
│   ├── services/
│   │   ├── planService.js (existing)
│   │   └── iapService.js (new - IAP handler)
│   └── utils/
│       └── purchaseValidator.js (new - server validation)
├── android/
│   └── app/
│       └── build.gradle (add RNIap dependency)
├── app.json (updated with IAP plugin)
└── GOOGLE_PLAY_IAP_SETUP.md (this file)
```

---

## Quick Reference: Common Commands

```bash
# Install IAP package
npm install react-native-iap

# Prebuild with clean (after app.json changes)
npx expo prebuild --clean

# Build release APK for testing
# Use Android Studio: Build → Generate Signed Bundle/APK

# Check IAP connection (debug)
adb shell setprop debug.reactnative.hermes.enabled true
```

---

## Support & Resources

- **Google Play IAP Docs:** https://developer.android.com/google/play/billing
- **react-native-iap Docs:** https://github.com/dooboolab-community/react-native-iap
- **Google Play Console:** https://play.google.com/console
- **Pricing Calculator:** https://play.google.com/console/pricing-calculator

---

**Last Updated:** May 2026
**Version:** 1.0
**Maintainer:** StaffTracker Team










# ....................

Help users understand how your app collects and shares their data

To help users better understand an app's privacy and security practices before they download it, we're asking developers to provide information about their app's safety. Select Next for an overview of the information that you need to provide.
 

First, you'll be asked whether your app collects or shares certain types of user data

Let us know whether your app collects or shares any of the required user data types. If it does, you'll be asked some questions about your privacy and security practices.


Next, answer questions about each type of user data

If your app does collect or share any of the required user data types, you'll be asked to select them. For each type of data, you'll be asked questions about how the data is used and handled.

When you're done, review and submit to add to your store listing

Before you submit, you'll see a preview of what will be shown to users on your Store Listing. The information that you provide will be reviewed by Google as part of the app review process. Find helpful resources in Google Help and Play Academy.

 







