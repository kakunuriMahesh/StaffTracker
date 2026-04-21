import { Alert } from 'react-native';
import { STAFF_LIMIT_FREE, setUserPlan, getStaffLimit } from '../services/planService';

export async function resetToFreePlan() {
  await setUserPlan('free', null);
  console.log('[UpgradeHelper] Reset to free plan');
}

export async function showUpgradeAlert(navigation) {
  const { limit, userPlan } = await getStaffLimit();
  const planName = userPlan === 'free' ? 'Free' : userPlan === 'monthly' ? 'Monthly' : 'Premium';
  Alert.alert(
    'Staff Limit Reached',
    `${planName} plan allows only ${limit} staff members. Upgrade to add more.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Upgrade',
        onPress: () => {
          if (navigation) {
            navigation.navigate('Upgrade');
          }
        },
      },
    ]
  );
}

export async function showPlanLimitAlert(currentCount, navigation) {
  const { limit, userPlan } = await getStaffLimit();
  const planName = userPlan === 'free' ? 'Free' : userPlan === 'monthly' ? 'Monthly' : 'Premium';
  Alert.alert(
    'Staff Limit Reached',
    `Your current ${planName} plan only allows ${limit} staff members. You have ${currentCount}/${limit} staff.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Upgrade',
        onPress: () => {
          if (navigation) {
            navigation.navigate('Upgrade');
          }
        },
      },
    ]
  );
}

export function showLockedAlert(navigation) {
  Alert.alert(
    'Staff Locked',
    'This staff is locked due to plan expiry. Upgrade your plan to manage all staff.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Upgrade',
        onPress: () => {
          if (navigation) {
            navigation.navigate('Upgrade');
          }
        },
      },
    ]
  );
}

export function showPlanExpiredAlert(navigation) {
  Alert.alert(
    'Plan Expired',
    'Your plan has expired. Some features are restricted. Upgrade to unlock all features.',
    [
      { text: 'OK', style: 'cancel' },
      {
        text: 'Upgrade',
        onPress: () => {
          if (navigation) {
            navigation.navigate('Upgrade');
          }
        },
      },
    ]
  );
}