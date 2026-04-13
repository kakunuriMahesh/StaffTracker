import * as SQLite from 'expo-sqlite';
import dayjs from 'dayjs';

const DB_NAME = 'stafftracker.db';

const openDb = async () => {
  return await SQLite.openDatabaseAsync(DB_NAME);
};

export const exportToJSON = async () => {
  const db = await openDb();
  
  const staff = await db.getAllAsync('SELECT * FROM staff ORDER BY id');
  const attendance = await db.getAllAsync('SELECT * FROM attendance ORDER BY date');
  const advances = await db.getAllAsync('SELECT * FROM advances ORDER BY date');
  const settings = await db.getAllAsync('SELECT * FROM settings');
  
  const settingsObj = {};
  if (settings && settings.length > 0) {
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
  }
  
  const data = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    staff: staff.map(s => ({
      id: s.id,
      name: s.name,
      position: s.position,
      salary: s.salary,
      salaryType: s.salary_type,
      salaryStartDate: s.salary_start_date,
      salaryEndDate: s.salary_end_date,
      phone: s.phone,
      joinDate: s.join_date,
      sundayHoliday: !!s.sunday_holiday,
      note: s.note || ''
    })),
    attendance: attendance.map(a => ({
      id: a.id,
      staffId: a.staff_id,
      date: a.date,
      status: a.status,
      note: a.note || ''
    })),
    payments: advances.map(a => ({
      id: a.id,
      staffId: a.staff_id,
      amount: a.amount,
      date: a.date,
      note: a.note || '',
      type: 'advance'
    })),
    settings: settingsObj,
    metadata: {
      lastModified: new Date().toISOString(),
      appVersion: '1.0.0'
    }
  };
  
  return JSON.stringify(data, null, 2);
};

export const importFromJSON = async (jsonString, mergeMode = 'replace') => {
  const db = await openDb();
  const data = JSON.parse(jsonString);
  
  await db.execAsync('BEGIN TRANSACTION');
  
  try {
    if (mergeMode === 'replace') {
      await db.execAsync('DELETE FROM advances');
      await db.execAsync('DELETE FROM attendance');
      await db.execAsync('DELETE FROM staff');
    }
    
    const staffIdMap = {};
    
    if (data.staff && Array.isArray(data.staff)) {
      for (const staffMember of data.staff) {
        if (mergeMode === 'replace') {
          const result = await db.runAsync(
            `INSERT INTO staff (name, position, salary, salary_type, salary_start_date, salary_end_date, phone, join_date, sunday_holiday, note) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              staffMember.name,
              staffMember.position,
              staffMember.salary,
              staffMember.salaryType || 'monthly',
              staffMember.salaryStartDate || null,
              staffMember.salaryEndDate || null,
              staffMember.phone || '',
              staffMember.joinDate,
              staffMember.sundayHoliday ? 1 : 0,
              staffMember.note || ''
            ]
          );
          staffIdMap[staffMember.id] = result.lastInsertRowId;
        } else {
          const existing = await db.getFirstAsync('SELECT id FROM staff WHERE name = ? AND phone = ?', 
            [staffMember.name, staffMember.phone || '']);
          if (existing) {
            staffIdMap[staffMember.id] = existing.id;
          } else {
            const result = await db.runAsync(
              `INSERT INTO staff (name, position, salary, salary_type, salary_start_date, salary_end_date, phone, join_date, sunday_holiday, note) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                staffMember.name,
                staffMember.position,
                staffMember.salary,
                staffMember.salaryType || 'monthly',
                staffMember.salaryStartDate || null,
                staffMember.salaryEndDate || null,
                staffMember.phone || '',
                staffMember.joinDate,
                staffMember.sundayHoliday ? 1 : 0,
                staffMember.note || ''
              ]
            );
            staffIdMap[staffMember.id] = result.lastInsertRowId;
          }
        }
      }
    }
    
    if (data.attendance && Array.isArray(data.attendance)) {
      for (const att of data.attendance) {
        const newStaffId = staffIdMap[att.staffId];
        if (!newStaffId) continue;
        
        if (mergeMode === 'replace') {
          await db.runAsync(
            `INSERT OR REPLACE INTO attendance (staff_id, date, status, note) VALUES (?, ?, ?, ?)`,
            [newStaffId, att.date, att.status, att.note || '']
          );
        } else {
          const existing = await db.getFirstAsync(
            'SELECT id FROM attendance WHERE staff_id = ? AND date = ?',
            [newStaffId, att.date]
          );
          if (!existing) {
            await db.runAsync(
              `INSERT INTO attendance (staff_id, date, status, note) VALUES (?, ?, ?, ?)`,
              [newStaffId, att.status, att.date, att.note || '']
            );
          }
        }
      }
    }
    
    if (data.payments && Array.isArray(data.payments)) {
      for (const payment of data.payments) {
        const newStaffId = staffIdMap[payment.staffId];
        if (!newStaffId) continue;
        
        if (mergeMode === 'replace') {
          await db.runAsync(
            `INSERT INTO advances (staff_id, amount, date, note) VALUES (?, ?, ?, ?)`,
            [newStaffId, payment.amount, payment.date, payment.note || '']
          );
        } else {
          await db.runAsync(
            `INSERT INTO advances (staff_id, amount, date, note) VALUES (?, ?, ?, ?)`,
            [newStaffId, payment.amount, payment.date, payment.note || '']
          );
        }
      }
    }
    
    await db.execAsync('COMMIT');
    
    return { success: true, staffCount: data.staff?.length || 0 };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
};

export const getStaffCount = async () => {
  const db = await openDb();
  const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM staff');
  return result?.count || 0;
};

export const getAttendanceCount = async () => {
  const db = await openDb();
  const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM attendance');
  return result?.count || 0;
};

export const getPaymentCount = async () => {
  const db = await openDb();
  const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM advances');
  return result?.count || 0;
};