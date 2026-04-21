import { loadStaff, saveStaff, loadAttendance, saveAttendance, loadAdvances, saveAdvances } from '../storage/localStorage';
import { getUserPlan } from '../services/planService';

let staffCache = null;
let attendanceCache = null;
let advancesCache = null;
let isReady = false;

export const isDBReady = () => isReady;

export async function initDatabase() {
  if (isReady) {
    return true;
  }
  
  console.log('[DB] Loading staff data...');
  try {
    const rawStaff = await loadStaff();
    const rawAttendance = await loadAttendance();
    const rawAdvances = await loadAdvances();
    
    staffCache = (rawStaff || []).map(s => ({
      ...s,
      is_deleted: s.is_deleted || 0,
      is_archived: s.is_archived || 0,
      archived_at: s.archived_at || null,
      deleted_at: s.deleted_at || null
    }));
    attendanceCache = (rawAttendance || []).map(a => ({
      ...a,
      is_deleted: a.is_deleted || 0,
      deleted_at: a.deleted_at || null
    }));
    advancesCache = (rawAdvances || []).map(a => ({
      ...a,
      is_deleted: a.is_deleted || 0,
      deleted_at: a.deleted_at || null
    }));
    
    isReady = true;
    console.log('[DB] Initialization complete');
    console.log('[DB] Staff loaded:', staffCache.filter(s => !s.is_deleted).length, 'active records');
    return true;
  } catch (e) {
    console.error('[DB] Init failed:', e);
    staffCache = [];
    attendanceCache = [];
    advancesCache = [];
    isReady = true;
    return true;
  }
}

async function ensureLoaded() {
  if (!isReady) {
    await initDatabase();
  }
  if (!staffCache) staffCache = [];
  if (!attendanceCache) attendanceCache = [];
  if (!advancesCache) advancesCache = [];
}

export async function addStaff(name, position, salary, phone, joinDate, salaryType, salaryStartDate, salaryEndDate, sundayHoliday, note) {
  await ensureLoaded();
  
  const maxId = staffCache.length > 0 ? Math.max(...staffCache.map(s => s.id)) : 0;
  const newId = maxId + 1;
  const now = new Date().toISOString();
  const newStaff = {
    id: newId,
    name,
    position,
    salary: parseFloat(salary),
    salary_type: salaryType || 'monthly',
    salary_start_date: salaryStartDate,
    salary_end_date: salaryEndDate,
    phone,
    join_date: joinDate,
    sunday_holiday: sundayHoliday ? 1 : 0,
    note: note || '',
    is_deleted: 0,
    deleted_at: null,
    updated_at: now
  };
  
  staffCache.push(newStaff);
  await saveStaff(staffCache);
  console.log('[DB] Staff added:', newId);
  return newId;
}

export async function getAllStaff(includeArchived = false) {
  await ensureLoaded();
  let activeStaff = staffCache.filter(s => !s.is_deleted);
  if (includeArchived) {
    activeStaff = staffCache.filter(s => !s.is_deleted || s.is_archived);
  } else {
    activeStaff = staffCache.filter(s => !s.is_deleted && !s.is_archived);
  }
  console.log('[DB] getAllStaff:', activeStaff.length, 'active records', includeArchived ? '(with archived)' : '');
  return activeStaff;
}

export async function getArchivedStaff() {
  await ensureLoaded();
  const archivedStaff = staffCache.filter(s => s.is_archived && !s.is_deleted);
  console.log('[DB] getArchivedStaff:', archivedStaff.length, 'archived records');
  return archivedStaff;
}

export async function getStaffById(id) {
  await ensureLoaded();
  const staff = staffCache.find(s => s.id === id && !s.is_deleted);
  if (staff) return staff;
  const archivedStaff = staffCache.find(s => s.id === id && s.is_archived && !s.is_deleted);
  return archivedStaff || null;
}

export async function updateStaff(id, name, position, salary, phone, salaryType, salaryStartDate, salaryEndDate, sundayHoliday, note) {
  await ensureLoaded();
  
  const index = staffCache.findIndex(s => s.id === id && !s.is_deleted);
  if (index !== -1) {
    const now = new Date().toISOString();
    staffCache[index] = {
      ...staffCache[index],
      name,
      position,
      salary: parseFloat(salary),
      phone,
      salary_type: salaryType || 'monthly',
      salary_start_date: salaryStartDate,
      salary_end_date: salaryEndDate,
      sunday_holiday: sundayHoliday ? 1 : 0,
      note: note || '',
      updated_at: now
    };
    await saveStaff(staffCache);
    console.log('[DB] Staff updated:', id);
  }
}

export async function deleteStaff(id) {
  await ensureLoaded();
  
  const index = staffCache.findIndex(s => s.id === id);
  if (index !== -1) {
    const now = new Date().toISOString();
    staffCache[index].is_deleted = 1;
    staffCache[index].deleted_at = now;
    
    const staffId = id;
    attendanceCache = attendanceCache.map(a => {
      if (a.staff_id === staffId && !a.is_deleted) {
        return { ...a, is_deleted: 1, deleted_at: now };
      }
      return a;
    });
    advancesCache = advancesCache.map(a => {
      if (a.staff_id === staffId && !a.is_deleted) {
        return { ...a, is_deleted: 1, deleted_at: now };
      }
      return a;
    });
    
    await saveStaff(staffCache);
    await saveAttendance(attendanceCache);
    await saveAdvances(advancesCache);
    console.log('[DB] Staff soft deleted:', id);
  }
}

export async function archiveStaff(id, skipSave = false) {
  await ensureLoaded();
  
  const index = staffCache.findIndex(s => s.id === id && !s.is_deleted);
  if (index !== -1) {
    const staff = { ...staffCache[index] };
    const now = new Date().toISOString();
    staffCache[index].is_archived = 1;
    staffCache[index].archived_at = now;
    
    if (!skipSave) {
      attendanceCache = attendanceCache.map(a => {
        if (a.staff_id === id && !a.is_deleted) {
          return { ...a, is_deleted: 1, deleted_at: now };
        }
        return a;
      });
      advancesCache = advancesCache.map(a => {
        if (a.staff_id === id && !a.is_deleted) {
          return { ...a, is_deleted: 1, deleted_at: now };
        }
        return a;
      });
    }
    
    if (skipSave) {
      staffCache[index]._pendingSave = true;
    } else {
      await saveStaff(staffCache);
      await saveAttendance(attendanceCache);
      await saveAdvances(advancesCache);
    }
    console.log('[DB] Staff archived:', id, skipSave ? '(skipSave)' : '');
    return { staff, id };
  }
  return null;
}

export async function unarchiveStaff(id) {
  await ensureLoaded();
  
  const index = staffCache.findIndex(s => s.id === id && !s.is_deleted);
  if (index !== -1) {
    staffCache[index].is_archived = 0;
    staffCache[index].archived_at = null;
    delete staffCache[index]._pendingSave;
    
    await saveStaff(staffCache);
    console.log('[DB] Staff unarchived:', id);
  }
}

export async function confirmArchive(id) {
  await ensureLoaded();
  
  const index = staffCache.findIndex(s => s.id === id && s.is_archived && !s.is_deleted);
  if (index !== -1) {
    const now = new Date().toISOString();
    delete staffCache[index]._pendingSave;
    await saveStaff(staffCache);
    
    attendanceCache = attendanceCache.map(a => {
      if (a.staff_id === id && !a.is_deleted) {
        return { ...a, is_deleted: 1, deleted_at: now };
      }
      return a;
    });
    advancesCache = advancesCache.map(a => {
      if (a.staff_id === id && !a.is_deleted) {
        return { ...a, is_deleted: 1, deleted_at: now };
      }
      return a;
    });
    
    await saveAttendance(attendanceCache);
    await saveAdvances(advancesCache);
    console.log('[DB] Archive confirmed, deleted attendance:', id);
  }
}

export async function markAttendance(staffId, date, status, note) {
  await ensureLoaded();
  
  const existingIndex = attendanceCache.findIndex(
    a => a.staff_id === staffId && a.date === date && !a.is_deleted
  );
  
  const now = new Date().toISOString();
  if (existingIndex !== -1) {
    attendanceCache[existingIndex].status = status;
    attendanceCache[existingIndex].note = note || '';
    attendanceCache[existingIndex].updated_at = now;
  } else {
    const maxId = attendanceCache.length > 0 ? Math.max(...attendanceCache.map(a => a.id)) : 0;
    attendanceCache.push({
      id: maxId + 1,
      staff_id: staffId,
      date,
      status,
      note: note || '',
      is_deleted: 0,
      deleted_at: null,
      updated_at: now
    });
  }
  
  await saveAttendance(attendanceCache);
  console.log('[DB] Attendance marked:', staffId, date, status);
}

export async function getAttendanceByDate(date) {
  await ensureLoaded();
  
  return attendanceCache
    .filter(a => a.date === date && !a.is_deleted)
    .map(a => {
      const staff = staffCache.find(s => s.id === a.staff_id && !s.is_deleted);
      return {
        ...a,
        name: staff?.name || '',
        position: staff?.position || ''
      };
    });
}

export async function getAttendanceByStaffAndMonth(staffId, year, month) {
  await ensureLoaded();
  
  const startDate = year + '-' + (month < 10 ? '0' + month : month) + '-01';
  const endDate = year + '-' + (month < 10 ? '0' + month : month) + '-31';
  
  return attendanceCache.filter(
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate && !a.is_deleted
  );
}

export async function getAttendanceByDateRange(staffId, startDate, endDate) {
  await ensureLoaded();
  
  return attendanceCache.filter(
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate && !a.is_deleted
  );
}

export async function getMonthlySummary(year, month) {
  await ensureLoaded();
  
  const startDate = year + '-' + (month < 10 ? '0' + month : month) + '-01';
  const endDate = year + '-' + (month < 10 ? '0' + month : month) + '-31';
  
  const activeStaff = staffCache.filter(s => !s.is_deleted);
  return activeStaff.map(staff => {
    const staffAttendance = attendanceCache.filter(
      a => a.staff_id === staff.id && a.date >= startDate && a.date <= endDate && !a.is_deleted
    );
    return {
      id: staff.id,
      name: staff.name,
      position: staff.position,
      salary: staff.salary,
      present: staffAttendance.filter(a => a.status === 'P').length,
      absent: staffAttendance.filter(a => a.status === 'A').length,
      leave: staffAttendance.filter(a => a.status === 'L').length
    };
  });
}

export async function addAdvance(staffId, amount, date, note) {
  await ensureLoaded();
  
  const maxId = advancesCache.length > 0 ? Math.max(...advancesCache.map(a => a.id)) : 0;
  const now = new Date().toISOString();
  const newAdvance = {
    id: maxId + 1,
    staff_id: staffId,
    amount: parseFloat(amount),
    date,
    note: note || '',
    is_deleted: 0,
    deleted_at: null,
    updated_at: now
  };
  
  advancesCache.push(newAdvance);
  await saveAdvances(advancesCache);
  console.log('[DB] Advance added:', staffId, amount);
}

export async function deleteAdvance(id) {
  await ensureLoaded();
  
  const index = advancesCache.findIndex(a => a.id === id);
  if (index !== -1) {
    const now = new Date().toISOString();
    advancesCache[index].is_deleted = 1;
    advancesCache[index].deleted_at = now;
    await saveAdvances(advancesCache);
    console.log('[DB] Advance soft deleted:', id);
  }
}

export async function updateAdvance(id, amount, date, note) {
  await ensureLoaded();
  
  const index = advancesCache.findIndex(a => a.id === id);
  if (index !== -1) {
    const now = new Date().toISOString();
    advancesCache[index].amount = parseFloat(amount);
    advancesCache[index].date = date;
    advancesCache[index].note = note || '';
    advancesCache[index].updated_at = now;
    await saveAdvances(advancesCache);
    console.log('[DB] Advance updated:', id);
  }
}

export async function getMonthlyAdvances(staffId, year, month) {
  await ensureLoaded();
  
  const startDate = year + '-' + (month < 10 ? '0' + month : month) + '-01';
  const endDate = year + '-' + (month < 10 ? '0' + month : month) + '-31';
  
  return advancesCache.filter(
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate && !a.is_deleted
  );
}

export async function getAdvancesByDateRange(staffId, startDate, endDate) {
  await ensureLoaded();
  
  return advancesCache.filter(
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate && !a.is_deleted
  );
}

export async function getAdvancesForStaff(staffId) {
  await ensureLoaded();
  
  return advancesCache
    .filter(a => a.staff_id === staffId && !a.is_deleted)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getAllAdvances() {
  await ensureLoaded();
  
  return advancesCache
    .filter(a => !a.is_deleted)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export const exportToJSON = async (googleId = null) => {
  await ensureLoaded();
  
  console.log('[DB] exportToJSON called, googleId:', googleId);
  console.log('[DB] Staff cache count:', staffCache.length);
  console.log('[DB] Attendance cache count:', attendanceCache.length);
  console.log('[DB] Advances cache count:', advancesCache.length);
  
  const activeStaff = staffCache.filter(s => !s.is_deleted && !s.is_archived);
  const archivedStaff = staffCache.filter(s => !s.is_deleted && s.is_archived);
  const activeAttendance = attendanceCache.filter(a => !a.is_deleted);
  const activeAdvances = advancesCache.filter(a => !a.is_deleted);
  
  console.log('[DB] Active staff count:', activeStaff.length);
  console.log('[DB] Archived staff count:', archivedStaff.length);
  console.log('[DB] Active attendance count:', activeAttendance.length);
  console.log('[DB] Active advances count:', activeAdvances.length);
  
  let planData = { userPlan: 'free', planExpiry: null };
  try {
    planData = await getUserPlan();
  } catch (e) {
    console.log('[DB] Could not get plan data:', e);
  }
  
  const data = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    googleId: googleId,
    staff: activeStaff.map(s => ({
      id: s.id,
      googleId: googleId,
      name: s.name,
      position: s.position,
      salary: s.salary,
      salaryType: s.salary_type,
      salaryStartDate: s.salary_start_date,
      salaryEndDate: s.salary_end_date,
      phone: s.phone,
      joinDate: s.join_date,
      sundayHoliday: !!s.sunday_holiday,
      note: s.note || '',
      isDeleted: false,
      deletedAt: null,
      updatedAt: s.updated_at
    })),
    deletedStaff: staffCache.filter(s => s.is_deleted).map(s => ({
      id: s.id,
      googleId: googleId,
      name: s.name,
      position: s.position,
      phone: s.phone,
      deletedAt: s.deleted_at
    })),
    archivedStaff: archivedStaff.map(s => ({
      id: s.id,
      googleId: googleId,
      name: s.name,
      position: s.position,
      salary: s.salary,
      salaryType: s.salary_type,
      salaryStartDate: s.salary_start_date,
      salaryEndDate: s.salary_end_date,
      phone: s.phone,
      joinDate: s.join_date,
      sundayHoliday: !!s.sunday_holiday,
      note: s.note || '',
      isArchived: true,
      archivedAt: s.archived_at,
      updatedAt: s.updated_at
    })),
    attendance: activeAttendance.map(a => ({
      id: a.id,
      googleId: googleId,
      staffId: a.staff_id,
      date: a.date,
      status: a.status,
      note: a.note || '',
      isDeleted: false,
      deletedAt: null
    })),
    deletedAttendance: attendanceCache.filter(a => a.is_deleted).map(a => ({
      id: a.id,
      googleId: googleId,
      staffId: a.staff_id,
      date: a.date,
      deletedAt: a.deleted_at
    })),
    payments: activeAdvances.map(a => ({
      id: a.id,
      googleId: googleId,
      staffId: a.staff_id,
      amount: a.amount,
      date: a.date,
      note: a.note || '',
      type: 'advance',
      isDeleted: false,
      deletedAt: null
    })),
    deletedPayments: advancesCache.filter(a => a.is_deleted).map(a => ({
      id: a.id,
      googleId: googleId,
      staffId: a.staff_id,
      amount: a.amount,
      date: a.date,
      deletedAt: a.deleted_at
    })),
    settings: {
      userPlan: planData.userPlan || 'free',
      planExpiry: planData.planExpiry,
    },
    metadata: {
      lastModified: new Date().toISOString(),
      appVersion: '1.0.0',
      staffCount: activeStaff.length,
      archivedStaffCount: archivedStaff.length,
      deletedStaffCount: staffCache.filter(s => s.is_deleted).length,
      attendanceCount: activeAttendance.length,
      deletedAttendanceCount: attendanceCache.filter(a => a.is_deleted).length,
      paymentCount: activeAdvances.length,
      deletedPaymentCount: advancesCache.filter(a => a.is_deleted).length
    }
  };
  
  console.log('[DB] Export complete, staff:', data.staff.length, 'attendance:', data.attendance.length, 'payments:', data.payments.length);
  
  return JSON.stringify(data, null, 2);
};

export const importFromJSON = async (jsonString, mergeMode = 'replace', targetGoogleId = null) => {
  await ensureLoaded();
  
  const data = JSON.parse(jsonString);
  const now = new Date().toISOString();
  
  console.log('[DB] importFromJSON mode:', mergeMode, 'staff count:', data.staff?.length || 0);
  
  if (mergeMode === 'replace') {
    if (data.staff) {
      staffCache = data.staff.map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        salary: s.salary,
        salary_type: s.salaryType || 'monthly',
        salary_start_date: s.salaryStartDate,
        salary_end_date: s.salaryEndDate,
        phone: s.phone,
        join_date: s.joinDate,
        sunday_holiday: s.sundayHoliday ? 1 : 0,
        note: s.note || '',
        is_deleted: s.isDeleted ? 1 : 0,
        deleted_at: s.deletedAt || null,
        updated_at: s.updatedAt || now
      }));
    }
    
    if (data.deletedStaff) {
      const deletedStaff = data.deletedStaff.map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        phone: s.phone,
        is_deleted: 1,
        deleted_at: s.deletedAt || now,
        updated_at: now
      }));
      staffCache = [...staffCache, ...deletedStaff];
    }
    
    if (data.archivedStaff) {
      const archived = data.archivedStaff.map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        salary: s.salary,
        salary_type: s.salaryType || 'monthly',
        salary_start_date: s.salaryStartDate,
        salary_end_date: s.salaryEndDate,
        phone: s.phone,
        join_date: s.joinDate,
        sunday_holiday: s.sundayHoliday ? 1 : 0,
        note: s.note || '',
        is_deleted: 0,
        is_archived: 1,
        archived_at: s.archivedAt || now,
        deleted_at: null,
        updated_at: s.updatedAt || now
      }));
      staffCache = [...staffCache, ...archived];
    }
    
    if (data.attendance) {
      attendanceCache = data.attendance.map(a => ({
        id: a.id,
        staff_id: a.staffId,
        date: a.date,
        status: a.status,
        note: a.note || '',
        is_deleted: a.isDeleted ? 1 : 0,
        deleted_at: a.deletedAt || null,
        updated_at: now
      }));
    }
    
    if (data.deletedAttendance) {
      const deletedAtt = data.deletedAttendance.map(a => ({
        id: a.id,
        staff_id: a.staffId,
        date: a.date,
        status: '',
        note: '',
        is_deleted: 1,
        deleted_at: a.deletedAt || now,
        updated_at: now
      }));
      attendanceCache = [...attendanceCache, ...deletedAtt];
    }
    
    if (data.payments) {
      advancesCache = data.payments.map(a => ({
        id: a.id,
        staff_id: a.staffId,
        amount: a.amount,
        date: a.date,
        note: a.note || '',
        is_deleted: a.isDeleted ? 1 : 0,
        deleted_at: a.deletedAt || null,
        updated_at: now
      }));
    }
    
    if (data.deletedPayments) {
      const deletedPayments = data.deletedPayments.map(a => ({
        id: a.id,
        staff_id: a.staffId,
        amount: a.amount,
        date: a.date,
        note: '',
        is_deleted: 1,
        deleted_at: a.deletedAt || now,
        updated_at: now
      }));
      advancesCache = [...advancesCache, ...deletedPayments];
    }
    
    await saveStaff(staffCache);
    await saveAttendance(attendanceCache);
    await saveAdvances(advancesCache);
    
    console.log('[DB] Import complete (replace), staff:', staffCache.length, 'attendance:', attendanceCache.length);
    return { success: true, staffCount: data.staff?.length || 0 };
  }
  
  if (mergeMode === 'merge') {
    console.log('[DB] Starting merge operation...');
    
    const existingStaffMap = new Map();
    staffCache.forEach(s => {
      existingStaffMap.set(s.id, s);
    });
    
    const existingAttendanceMap = new Map();
    attendanceCache.forEach(a => {
      existingAttendanceMap.set(`${a.staff_id}_${a.date}`, a);
    });
    
    const existingAdvancesMap = new Map();
    advancesCache.forEach(a => {
      existingAdvancesMap.set(`${a.staff_id}_${a.date}_${a.amount}`, a);
    });
    
    if (data.staff && data.staff.length > 0) {
      for (const remoteStaff of data.staff) {
        const localStaff = existingStaffMap.get(remoteStaff.id);
        
        if (!localStaff) {
          staffCache.push({
            id: remoteStaff.id,
            name: remoteStaff.name,
            position: remoteStaff.position,
            salary: remoteStaff.salary,
            salary_type: remoteStaff.salaryType || 'monthly',
            salary_start_date: remoteStaff.salaryStartDate,
            salary_end_date: remoteStaff.salaryEndDate,
            phone: remoteStaff.phone,
            join_date: remoteStaff.joinDate,
            sunday_holiday: remoteStaff.sundayHoliday ? 1 : 0,
            note: remoteStaff.note || '',
            is_deleted: 0,
            deleted_at: null,
            updated_at: remoteStaff.updatedAt || now
          });
          console.log('[DB] Merge: Added new staff:', remoteStaff.name);
        } else {
          const localUpdated = new Date(localStaff.updated_at || 0);
          const remoteUpdated = new Date(remoteStaff.updatedAt || 0);
          
          if (remoteUpdated > localUpdated) {
            const index = staffCache.findIndex(s => s.id === remoteStaff.id);
            staffCache[index] = {
              ...staffCache[index],
              name: remoteStaff.name,
              position: remoteStaff.position,
              salary: remoteStaff.salary,
              salary_type: remoteStaff.salaryType || 'monthly',
              phone: remoteStaff.phone,
              join_date: remoteStaff.joinDate,
              sunday_holiday: remoteStaff.sundayHoliday ? 1 : 0,
              note: remoteStaff.note || '',
              updated_at: remoteStaff.updatedAt || now
            };
            console.log('[DB] Merge: Updated staff (newer):', remoteStaff.name);
          }
        }
      }
    }
    
    if (data.deletedStaff && data.deletedStaff.length > 0) {
      for (const deletedStaff of data.deletedStaff) {
        const existingIndex = staffCache.findIndex(s => s.id === deletedStaff.id);
        if (existingIndex >= 0) {
          staffCache[existingIndex].is_deleted = 1;
          staffCache[existingIndex].deleted_at = deletedStaff.deletedAt || now;
          console.log('[DB] Merge: Marked staff as deleted:', deletedStaff.name);
        }
      }
    }
    
    if (data.archivedStaff && data.archivedStaff.length > 0) {
      for (const archived of data.archivedStaff) {
        const existingIndex = staffCache.findIndex(s => s.id === archived.id);
        if (existingIndex >= 0) {
          staffCache[existingIndex].is_archived = 1;
          staffCache[existingIndex].archived_at = archived.archivedAt || now;
          console.log('[DB] Merge: Marked staff as archived:', archived.name);
        } else {
          staffCache.push({
            id: archived.id,
            name: archived.name,
            position: archived.position,
            salary: archived.salary,
            salary_type: archived.salaryType || 'monthly',
            salary_start_date: archived.salaryStartDate,
            salary_end_date: archived.salaryEndDate,
            phone: archived.phone,
            join_date: archived.joinDate,
            sunday_holiday: archived.sundayHoliday ? 1 : 0,
            note: archived.note || '',
            is_deleted: 0,
            is_archived: 1,
            archived_at: archived.archivedAt || now,
            deleted_at: null,
            updated_at: archived.updatedAt || now
          });
          console.log('[DB] Merge: Added archived staff:', archived.name);
        }
      }
    }
    
    if (data.attendance && data.attendance.length > 0) {
      for (const remoteAtt of data.attendance) {
        const key = `${remoteAtt.staffId}_${remoteAtt.date}`;
        const localAtt = existingAttendanceMap.get(key);
        
        if (!localAtt) {
          attendanceCache.push({
            id: remoteAtt.id,
            staff_id: remoteAtt.staffId,
            date: remoteAtt.date,
            status: remoteAtt.status,
            note: remoteAtt.note || '',
            is_deleted: 0,
            deleted_at: null,
            updated_at: now
          });
        }
      }
    }
    
    if (data.deletedAttendance && data.deletedAttendance.length > 0) {
      for (const deletedAtt of data.deletedAttendance) {
        const key = `${deletedAtt.staffId}_${deletedAtt.date}`;
        const existingIndex = attendanceCache.findIndex(a => a.staff_id === deletedAtt.staffId && a.date === deletedAtt.date);
        if (existingIndex >= 0) {
          attendanceCache[existingIndex].is_deleted = 1;
          attendanceCache[existingIndex].deleted_at = deletedAtt.deletedAt || now;
        }
      }
    }
    
    if (data.payments && data.payments.length > 0) {
      for (const remoteAdv of data.payments) {
        const key = `${remoteAdv.staffId}_${remoteAdv.date}_${remoteAdv.amount}`;
        const localAdv = existingAdvancesMap.get(key);
        
        if (!localAdv) {
          advancesCache.push({
            id: remoteAdv.id,
            staff_id: remoteAdv.staffId,
            amount: remoteAdv.amount,
            date: remoteAdv.date,
            note: remoteAdv.note || '',
            is_deleted: 0,
            deleted_at: null,
            updated_at: now
          });
        }
      }
    }
    
    if (data.deletedPayments && data.deletedPayments.length > 0) {
      for (const deletedPay of data.deletedPayments) {
        const existingIndex = advancesCache.findIndex(a => a.id === deletedPay.id);
        if (existingIndex >= 0) {
          advancesCache[existingIndex].is_deleted = 1;
          advancesCache[existingIndex].deleted_at = deletedPay.deletedAt || now;
        }
      }
    }
    
    await saveStaff(staffCache);
    await saveAttendance(attendanceCache);
    await saveAdvances(advancesCache);
    
    console.log('[DB] Merge complete, staff:', staffCache.length, 'attendance:', attendanceCache.length);
    return { success: true, staffCount: data.staff?.length || 0 };
  }
  
  return { success: true, staffCount: data.staff?.length || 0 };
};