import { loadStaff, saveStaff, loadAttendance, saveAttendance, loadAdvances, saveAdvances } from '../storage/localStorage';

let staffCache = null;
let attendanceCache = null;
let advancesCache = null;
let isReady = false;

export async function initDatabase() {
  if (isReady) {
    return true;
  }
  
  console.log('[DB] Loading staff data...');
  try {
    staffCache = await loadStaff();
    attendanceCache = await loadAttendance();
    advancesCache = await loadAdvances();
    isReady = true;
    console.log('[DB] Initialization complete');
    console.log('[DB] Staff loaded:', staffCache.length, 'records');
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
  
  const newId = staffCache.length > 0 ? Math.max(...staffCache.map(s => s.id)) + 1 : 1;
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
    note: note || ''
  };
  
  staffCache.push(newStaff);
  await saveStaff(staffCache);
  console.log('[DB] Staff added:', newId);
  return newId;
}

export async function getAllStaff() {
  await ensureLoaded();
  console.log('[DB] getAllStaff:', staffCache.length, 'records');
  return staffCache || [];
}

export async function getStaffById(id) {
  await ensureLoaded();
  return staffCache.find(s => s.id === id) || null;
}

export async function updateStaff(id, name, position, salary, phone, salaryType, salaryStartDate, salaryEndDate, sundayHoliday, note) {
  await ensureLoaded();
  
  const index = staffCache.findIndex(s => s.id === id);
  if (index !== -1) {
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
      note: note || ''
    };
    await saveStaff(staffCache);
    console.log('[DB] Staff updated:', id);
  }
}

export async function deleteStaff(id) {
  await ensureLoaded();
  
  staffCache = staffCache.filter(s => s.id !== id);
  attendanceCache = attendanceCache.filter(a => a.staff_id !== id);
  advancesCache = advancesCache.filter(a => a.staff_id !== id);
  
  await saveStaff(staffCache);
  await saveAttendance(attendanceCache);
  await saveAdvances(advancesCache);
  console.log('[DB] Staff deleted:', id);
}

export async function markAttendance(staffId, date, status, note) {
  await ensureLoaded();
  
  const existingIndex = attendanceCache.findIndex(
    a => a.staff_id === staffId && a.date === date
  );
  
  if (existingIndex !== -1) {
    attendanceCache[existingIndex].status = status;
    attendanceCache[existingIndex].note = note || '';
  } else {
    attendanceCache.push({
      id: attendanceCache.length > 0 ? Math.max(...attendanceCache.map(a => a.id)) + 1 : 1,
      staff_id: staffId,
      date,
      status,
      note: note || ''
    });
  }
  
  await saveAttendance(attendanceCache);
  console.log('[DB] Attendance marked:', staffId, date, status);
}

export async function getAttendanceByDate(date) {
  await ensureLoaded();
  
  return attendanceCache
    .filter(a => a.date === date)
    .map(a => {
      const staff = staffCache.find(s => s.id === a.staff_id);
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
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate
  );
}

export async function getAttendanceByDateRange(staffId, startDate, endDate) {
  await ensureLoaded();
  
  return attendanceCache.filter(
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate
  );
}

export async function getMonthlySummary(year, month) {
  await ensureLoaded();
  
  const startDate = year + '-' + (month < 10 ? '0' + month : month) + '-01';
  const endDate = year + '-' + (month < 10 ? '0' + month : month) + '-31';
  
  return staffCache.map(staff => {
    const staffAttendance = attendanceCache.filter(
      a => a.staff_id === staff.id && a.date >= startDate && a.date <= endDate
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
  
  const newAdvance = {
    id: advancesCache.length > 0 ? Math.max(...advancesCache.map(a => a.id)) + 1 : 1,
    staff_id: staffId,
    amount: parseFloat(amount),
    date,
    note: note || ''
  };
  
  advancesCache.push(newAdvance);
  await saveAdvances(advancesCache);
  console.log('[DB] Advance added:', staffId, amount);
}

export async function deleteAdvance(id) {
  await ensureLoaded();
  
  advancesCache = advancesCache.filter(a => a.id !== id);
  await saveAdvances(advancesCache);
}

export async function getMonthlyAdvances(staffId, year, month) {
  await ensureLoaded();
  
  const startDate = year + '-' + (month < 10 ? '0' + month : month) + '-01';
  const endDate = year + '-' + (month < 10 ? '0' + month : month) + '-31';
  
  return advancesCache.filter(
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate
  );
}

export async function getAdvancesByDateRange(staffId, startDate, endDate) {
  await ensureLoaded();
  
  return advancesCache.filter(
    a => a.staff_id === staffId && a.date >= startDate && a.date <= endDate
  );
}

export async function getAdvancesForStaff(staffId) {
  await ensureLoaded();
  
  return advancesCache
    .filter(a => a.staff_id === staffId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getAllAdvances() {
  await ensureLoaded();
  
  return advancesCache.sort((a, b) => new Date(b.date) - new Date(a.date));
}