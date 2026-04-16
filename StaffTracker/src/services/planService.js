import { documentDirectory, readAsStringAsync, writeAsStringAsync, getInfoAsync } from 'expo-file-system/legacy';

const PLAN_FILE = 'plan_settings.json';
const PLAN_KEY = 'userPlan';
const PLAN_EXPIRY_KEY = 'planExpiry';

const getPlanFileUri = () => documentDirectory + PLAN_FILE;

async function readPlanFile() {
  try {
    const fileUri = getPlanFileUri();
    const info = await getInfoAsync(fileUri);
    if (!info.exists) {
      return null;
    }
    const content = await readAsStringAsync(fileUri);
    return content ? JSON.parse(content) : null;
  } catch (e) {
    console.log('[PlanService] Read error:', e.message);
    return null;
  }
}

async function writePlanFile(data) {
  try {
    await writeAsStringAsync(getPlanFileUri(), JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.log('[PlanService] Write error:', e.message);
    return false;
  }
}

export const STAFF_LIMIT_FREE = 5;

export const PLAN_TYPES = {
  FREE: 'free',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
};

export const PLAN_PRICES = {
  free: 0,
  monthly: 99,
  yearly: 599,
  lifetime: 999,
};

export const PLAN_LABELS = {
  free: 'Free',
  monthly: 'Monthly',
  yearly: 'Yearly',
  lifetime: 'Lifetime',
};

export async function getUserPlan() {
  try {
    const planData = await readPlanFile();
    if (planData) {
      return {
        userPlan: planData.userPlan || 'free',
        planExpiry: planData.planExpiry || null,
      };
    }
  } catch (error) {
    console.log('[PlanService] Get plan error:', error);
  }
  return { userPlan: 'free', planExpiry: null };
}

export async function setUserPlan(plan, expiry = null) {
  try {
    const planData = {
      userPlan: plan,
      planExpiry: expiry,
    };
    await writePlanFile(planData);
    console.log('[PlanService] Plan set:', plan, expiry);
    return true;
  } catch (error) {
    console.log('[PlanService] Set plan error:', error);
    return false;
  }
}

export function isPlanActive(plan, planExpiry) {
  if (plan === 'free' || plan === 'lifetime') {
    return true;
  }
  if (!planExpiry) {
    return false;
  }
  return new Date(planExpiry) > new Date();
}

export async function canAddStaff(currentCount) {
  const { userPlan, planExpiry } = await getUserPlan();
  
  if (userPlan === 'free') {
    return currentCount < STAFF_LIMIT_FREE;
  }
  
  return isPlanActive(userPlan, planExpiry);
}

export async function getPlanDetails() {
  const { userPlan, planExpiry } = await getUserPlan();
  
  return {
    userPlan,
    planExpiry,
    isActive: isPlanActive(userPlan, planExpiry),
    isFree: userPlan === 'free',
    staffLimit: userPlan === 'free' ? STAFF_LIMIT_FREE : -1,
  };
}

export function formatExpiryDate(expiry) {
  if (!expiry) return null;
  try {
    const date = new Date(expiry);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  } catch {
    return null;
  }
}