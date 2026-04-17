import { getCurrentPlan, getStaffLimit, STAFF_LIMIT_FREE } from '../services/planService';

export async function getEffectivePlan() {
  const planInfo = await getCurrentPlan();
  return {
    userPlan: planInfo.userPlan,
    planExpiry: planInfo.planExpiry,
    isActive: planInfo.isActive,
    effectivePlan: planInfo.isActive ? planInfo.userPlan : 'free',
  };
}

export async function applyStaffLocking(staffList) {
  console.log('[StaffAccessControl] applyStaffLocking called, staff count:', staffList?.length || 0);
  
  if (!staffList || staffList.length === 0) {
    return [];
  }

  try {
    const planInfo = await getCurrentPlan();
    console.log('[StaffAccessControl] planInfo:', planInfo);
    
    // Check if plan is active AND not free - both conditions must be met
    // If plan is free OR expired, apply locking
    if (planInfo.isActive && !planInfo.isFree) {
      console.log('[StaffAccessControl] Plan is premium/active, all staff unlocked');
      return staffList.map(s => ({ ...s, isLocked: false }));
    }

    console.log('[StaffAccessControl] Plan is free OR expired, applying locking');
    const sorted = [...staffList].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });

    const result = sorted.map((staff, index) => ({
      ...staff,
      isLocked: index >= STAFF_LIMIT_FREE,
    }));
    
    console.log('[StaffAccessControl] Locking result - locked count:', result.filter(s => s.isLocked).length);
    return result;
  } catch (error) {
    console.log('[StaffAccessControl] Error:', error.message);
    return staffList.map(s => ({ ...s, isLocked: false }));
  }
}

export function isStaffLocked(staff) {
  return staff?.isLocked === true;
}

export function canEditStaff(staff) {
  return !isStaffLocked(staff);
}

export async function canMarkAttendance(staff) {
  const planInfo = await getCurrentPlan();
  if (!planInfo.isActive) {
    return false;
  }
  return true;
}

export async function canAddAdvance(staff) {
  const planInfo = await getCurrentPlan();
  if (!planInfo.isActive) {
    return false;
  }
  return true;
}

export function canDeleteStaff() {
  return true;
}

export async function getLockedStaffCount(staffList) {
  const processed = await applyStaffLocking(staffList);
  return processed.filter(s => s.isLocked).length;
}

export function getUnlockMessage() {
  return 'This staff is locked due to plan expiry. Upgrade your plan to manage all staff.';
}

export async function checkPlanAndGetStaff(staffList) {
  const { limit, isUnlimited } = await getStaffLimit();
  
  if (isUnlimited) {
    return staffList.map(s => ({ ...s, isLocked: false }));
  }
  
  const sorted = [...staffList].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
  
  return sorted.map((staff, index) => ({
    ...staff,
    isLocked: index >= limit,
  }));
}