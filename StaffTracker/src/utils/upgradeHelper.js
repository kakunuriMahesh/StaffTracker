import { Alert } from 'react-native';
import { STAFF_LIMIT_FREE, setUserPlan } from '../services/planService';

export async function resetToFreePlan() {
  await setUserPlan('free', null);
  console.log('[UpgradeHelper] Reset to free plan');
}

export function showUpgradeAlert(navigation) {
  Alert.alert(
    'Staff Limit Reached',
    `Free plan allows only ${STAFF_LIMIT_FREE} staff members. Upgrade to add more.`,
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

export function showPlanLimitAlert(currentCount, navigation) {
  Alert.alert(
    'Staff Limit Reached',
    `Your current plan only allows ${STAFF_LIMIT_FREE} staff members. You have ${currentCount}/${STAFF_LIMIT_FREE} staff.`,
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