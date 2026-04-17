import { documentDirectory, readAsStringAsync, writeAsStringAsync, getInfoAsync } from 'expo-file-system/legacy';

const PLAN_FILE = 'plan_settings.json';
const PLAN_KEY = 'userPlan';
const PLAN_EXPIRY_KEY = 'planExpiry';

let cachedPlanData = null;

const getPlanFileUri = () => documentDirectory + PLAN_FILE;

async function readPlanFile(forceRefresh = false) {
  console.log('[PlanService] readPlanFile called, forceRefresh:', forceRefresh, 'cached:', cachedPlanData !== null);
  if (!forceRefresh && cachedPlanData) {
    console.log('[PlanService] Returning cached data:', cachedPlanData);
    return cachedPlanData;
  }
  try {
    const fileUri = getPlanFileUri();
    console.log('[PlanService] Reading from file:', fileUri);
    const info = await getInfoAsync(fileUri);
    console.log('[PlanService] File info:', info);
    if (!info.exists) {
      console.log('[PlanService] File does not exist');
      cachedPlanData = null;
      return null;
    }
    const content = await readAsStringAsync(fileUri);
    console.log('[PlanService] Raw file content:', content);
    cachedPlanData = content ? JSON.parse(content) : null;
    console.log('[PlanService] Parsed data:', cachedPlanData);
    return cachedPlanData;
  } catch (e) {
    console.log('[PlanService] Read error:', e.message);
    cachedPlanData = null;
    return null;
  }
}

function clearPlanCache() {
  cachedPlanData = null;
}

const planListeners = new Set();

export function addPlanChangeListener(callback) {
  planListeners.add(callback);
  return () => planListeners.delete(callback);
}

function notifyPlanChange() {
  planListeners.forEach(callback => {
    try {
      callback();
    } catch (e) {
      console.log('[PlanListener] Error:', e.message);
    }
  });
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
    const currentData = await readPlanFile(true);
    const planData = {
      userPlan: plan,
      planExpiry: expiry,
      originalPlan: plan !== 'free' ? (currentData?.originalPlan || currentData?.userPlan || plan) : (currentData?.originalPlan || null),
      lastUpdated: new Date().toISOString(),
    };
    await writePlanFile(planData);
    clearPlanCache();
    notifyPlanChange();
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
  const planInfo = await getCurrentPlan();
  console.log('[PlanService] canAddStaff - planInfo:', planInfo);
  
  // If plan is premium/active (not free), allow unlimited
  if (planInfo.isActive && !planInfo.isFree) {
    console.log('[PlanService] canAddStaff: true (premium plan)');
    return true;
  }
  
  const allowed = currentCount < STAFF_LIMIT_FREE;
  console.log('[PlanService] canAddStaff:', allowed, 'current:', currentCount, 'limit:', STAFF_LIMIT_FREE);
  return allowed;
}

export async function getPlanDetails() {
  const { userPlan, planExpiry } = await getUserPlan();
  const active = isPlanActive(userPlan, planExpiry);
  const isExpired = !active && userPlan !== 'free' && userPlan !== 'lifetime';
  
  return {
    userPlan,
    planExpiry,
    isActive: active,
    isExpired,
    isFree: userPlan === 'free',
    staffLimit: !active ? STAFF_LIMIT_FREE : -1,
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

export async function isPlanExpired() {
  const { userPlan, planExpiry } = await getUserPlan();
  if (userPlan === 'free' || userPlan === 'lifetime') {
    return false;
  }
  if (!planExpiry) {
    return true;
  }
  return new Date(planExpiry) <= new Date();
}

export async function getPlanStatus() {
  const { userPlan, planExpiry } = await getUserPlan();
  const active = isPlanActive(userPlan, planExpiry);
  
  return {
    userPlan,
    planExpiry,
    isActive: active,
    isExpired: !active && (userPlan !== 'free' && userPlan !== 'lifetime'),
    isFree: userPlan === 'free',
    isLifetime: userPlan === 'lifetime',
  };
}

export async function getCurrentPlan() {
  console.log('[PlanService] getCurrentPlan called');
  const planData = await readPlanFile();
  console.log('[PlanService] planData from readPlanFile:', planData);
  const userPlan = planData?.userPlan || 'free';
  const planExpiry = planData?.planExpiry || null;
  const isActive = isPlanActive(userPlan, planExpiry);
  
  console.log('[PlanService] getCurrentPlan result:', { userPlan, planExpiry, isActive, isFree: userPlan === 'free' });
  
  return { 
    userPlan, 
    planExpiry, 
    isActive,
    isFree: userPlan === 'free'
  };
}

export async function getStaffLimit() {
  const { userPlan, isActive } = await getCurrentPlan();
  
  if (userPlan === 'free' || !isActive) {
    return { limit: STAFF_LIMIT_FREE, isUnlimited: false, userPlan: 'free' };
  }
  
  return { limit: -1, isUnlimited: true, userPlan };
}

export async function canAddNewStaff(currentStaffCount) {
  const { limit, isUnlimited } = await getStaffLimit();
  
  if (isUnlimited) {
    return { allowed: true, reason: null };
  }
  
  if (currentStaffCount >= limit) {
    return { allowed: false, reason: 'limit_reached' };
  }
  
  return { allowed: true, reason: null };
}