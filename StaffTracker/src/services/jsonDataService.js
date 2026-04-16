import * as SQLite from 'expo-sqlite';
import dayjs from 'dayjs';
import { getUserPlan } from '../services/planService';

const DB_NAME = 'stafftracker.db';

let dbInstance = null;
let isInitialized = false;
let isInitializing = false;
let initError = null;

export const isDBReady = () => {
  return dbInstance !== null && isInitialized === true && initError === null;
};

export const resetDbConnection = async () => {
  console.log('[JSONData] resetDbConnection called (deprecated - should not be called)');
};

export const getDB = () => {
  if (!dbInstance || !isInitialized) {
    throw new Error('Database not initialized. Call initJsonDatabase() first.');
  }
  return dbInstance;
};

const openDb = async () => {
  if (dbInstance && isInitialized && !initError) {
    return dbInstance;
  }
  
  if (isInitializing) {
    console.log('[JSONData] Already initializing, waiting...');
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return dbInstance;
  }
  
  isInitializing = true;
  
  try {
    if (!dbInstance) {
      console.log('[JSONData] Opening database:', DB_NAME);
      dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    }
    
    if (!isInitialized) {
      await initTables(dbInstance);
    }
    
    initError = null;
    isInitializing = false;
    console.log('[JSONData] DB ready, isDBReady:', isDBReady());
    return dbInstance;
  } catch (error) {
    console.log('[JSONData] Database open error:', error);
    initError = error;
    isInitializing = false;
    throw error;
  }
};

const initTables = async (db) => {
  if (isInitialized) return;
  
  try {
    console.log('[JSONData] Creating tables...');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT,
        name TEXT NOT NULL,
        position TEXT,
        salary REAL DEFAULT 0,
        salary_type TEXT DEFAULT 'monthly',
        salary_start_date TEXT,
        salary_end_date TEXT,
        phone TEXT,
        join_date TEXT,
        sunday_holiday INTEGER DEFAULT 0,
        note TEXT,
        is_deleted INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT
      )
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT,
        staff_id INTEGER,
        date TEXT,
        status TEXT,
        note TEXT,
        is_deleted INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS advances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT,
        staff_id INTEGER,
        amount REAL,
        date TEXT,
        note TEXT,
        is_deleted INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT
      )
    `);
    
    console.log('[JSONData] Running migrations for existing DBs...');
    
    try {
      await db.execAsync('ALTER TABLE staff ADD COLUMN google_id TEXT');
      console.log('[JSONData] Migration: added google_id to staff');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: google_id column already exists in staff');
      } else {
        console.log('[JSONData] Migration: google_id for staff skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE staff ADD COLUMN is_deleted INTEGER DEFAULT 0');
      console.log('[JSONData] Migration: added is_deleted to staff');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: is_deleted column already exists in staff');
      } else {
        console.log('[JSONData] Migration: is_deleted for staff skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE staff ADD COLUMN deleted_at TEXT');
      console.log('[JSONData] Migration: added deleted_at to staff');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: deleted_at column already exists in staff');
      } else {
        console.log('[JSONData] Migration: deleted_at for staff skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE staff ADD COLUMN updated_at TEXT');
      console.log('[JSONData] Migration: added updated_at to staff');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: updated_at column already exists in staff');
      } else {
        console.log('[JSONData] Migration: updated_at for staff skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE attendance ADD COLUMN google_id TEXT');
      console.log('[JSONData] Migration: added google_id to attendance');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: google_id column already exists in attendance');
      } else {
        console.log('[JSONData] Migration: google_id for attendance skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE attendance ADD COLUMN is_deleted INTEGER DEFAULT 0');
      console.log('[JSONData] Migration: added is_deleted to attendance');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: is_deleted column already exists in attendance');
      } else {
        console.log('[JSONData] Migration: is_deleted for attendance skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE attendance ADD COLUMN deleted_at TEXT');
      console.log('[JSONData] Migration: added deleted_at to attendance');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: deleted_at column already exists in attendance');
      } else {
        console.log('[JSONData] Migration: deleted_at for attendance skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE attendance ADD COLUMN updated_at TEXT');
      console.log('[JSONData] Migration: added updated_at to attendance');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: updated_at column already exists in attendance');
      } else {
        console.log('[JSONData] Migration: updated_at for attendance skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE advances ADD COLUMN google_id TEXT');
      console.log('[JSONData] Migration: added google_id to advances');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: google_id column already exists in advances');
      } else {
        console.log('[JSONData] Migration: google_id for advances skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE advances ADD COLUMN is_deleted INTEGER DEFAULT 0');
      console.log('[JSONData] Migration: added is_deleted to advances');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: is_deleted column already exists in advances');
      } else {
        console.log('[JSONData] Migration: is_deleted for advances skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE advances ADD COLUMN deleted_at TEXT');
      console.log('[JSONData] Migration: added deleted_at to advances');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: deleted_at column already exists in advances');
      } else {
        console.log('[JSONData] Migration: deleted_at for advances skipped:', e.message);
      }
    }
    
    try {
      await db.execAsync('ALTER TABLE advances ADD COLUMN updated_at TEXT');
      console.log('[JSONData] Migration: added updated_at to advances');
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        console.log('[JSONData] Migration: updated_at column already exists in advances');
      } else {
        console.log('[JSONData] Migration: updated_at for advances skipped:', e.message);
      }
    }
    
    isInitialized = true;
    initError = null;
    console.log('[JSONData] Tables and migrations complete');
  } catch (error) {
    console.log('[JSONData] Table init error:', error);
    initError = error;
    throw error;
  }
};

export const initJsonDatabase = async () => {
  try {
    const db = await openDb();
    console.log('[JSONData] initJsonDatabase complete, isDBReady:', isDBReady());
    return db;
  } catch (error) {
    console.log('[JSONData] initJsonDatabase failed:', error.message);
    throw error;
  }
};

export const migrateGoogleId = async (googleId) => {
  if (!isDBReady()) {
    console.log('[JSONData] migrateGoogleId: DB not ready');
    return false;
  }
  
  try {
    const db = getDB();
    
    const staffResult = await db.runAsync(
      'UPDATE staff SET google_id = ? WHERE google_id IS NULL',
      [googleId]
    );
    console.log('[JSONData] Migrated staff rows:', staffResult.changes);
    
    const attResult = await db.runAsync(
      'UPDATE attendance SET google_id = ? WHERE google_id IS NULL',
      [googleId]
    );
    console.log('[JSONData] Migrated attendance rows:', attResult.changes);
    
    const advResult = await db.runAsync(
      'UPDATE advances SET google_id = ? WHERE google_id IS NULL',
      [googleId]
    );
    console.log('[JSONData] Migrated advances rows:', advResult.changes);
    
    return true;
  } catch (error) {
    console.log('[JSONData] migrateGoogleId error:', error.message);
    return false;
  }
};

export const exportToJSON = async (googleId = null) => {
  let db;
  
  try {
    if (!isDBReady()) {
      db = await openDb();
    } else {
      db = getDB();
    }
  } catch (error) {
    console.log('[JSONData] DB open failed for export:', error.message);
  }
  
  if (!db || !isInitialized) {
    console.log('[JSONData] DB not ready, returning empty data');
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      staff: [],
      attendance: [],
      payments: [],
      settings: {},
      metadata: {
        lastModified: new Date().toISOString(),
        appVersion: '1.0.0'
      }
    });
  }
  
  try {
    console.log('[JSONData] Starting export with googleId:', googleId);
    
    const allStaff = await db.getAllAsync('SELECT * FROM staff ORDER BY id');
    const allAttendance = await db.getAllAsync('SELECT * FROM attendance ORDER BY date');
    const allAdvances = await db.getAllAsync('SELECT * FROM advances ORDER BY date');
    const settings = await db.getAllAsync('SELECT * FROM settings');
    
    console.log('[JSONData] Raw DB counts:', {
      totalStaff: allStaff?.length || 0,
      totalAttendance: allAttendance?.length || 0,
      totalAdvances: allAdvances?.length || 0
    });
    
    let staff = allStaff;
    let attendance = allAttendance;
    let advances = allAdvances;
    
    if (googleId) {
      staff = allStaff.filter(s => s.google_id === googleId || s.google_id === null);
      attendance = allAttendance.filter(a => a.google_id === googleId || a.google_id === null);
      advances = allAdvances.filter(a => a.google_id === googleId || a.google_id === null);
    }
    
    console.log('[JSONData] Filtered counts (googleId):', {
      staff: staff?.length || 0,
      attendance: attendance?.length || 0,
      advances: advances?.length || 0
    });
    
    const settingsObj = {};
    if (settings && settings.length > 0) {
      settings.forEach(s => {
        settingsObj[s.key] = s.value;
      });
    }
    
    let planData = { userPlan: 'free', planExpiry: null };
    try {
      planData = await getUserPlan();
    } catch (e) {
      console.log('[JSONData] Could not get plan data:', e);
    }
    
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      googleId: googleId,
      staff: staff.filter(s => !s.is_deleted).map(s => ({
        id: s.id,
        googleId: s.google_id,
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
        isDeleted: !!s.is_deleted,
        deletedAt: s.deleted_at,
        updatedAt: s.updated_at
      })),
      deletedStaff: staff.filter(s => s.is_deleted).map(s => ({
        id: s.id,
        googleId: s.google_id,
        name: s.name,
        position: s.position,
        phone: s.phone,
        deletedAt: s.deleted_at
      })),
      attendance: attendance.filter(a => !a.is_deleted).map(a => ({
        id: a.id,
        googleId: a.google_id,
        staffId: a.staff_id,
        date: a.date,
        status: a.status,
        note: a.note || '',
        isDeleted: !!a.is_deleted,
        deletedAt: a.deleted_at
      })),
      deletedAttendance: attendance.filter(a => a.is_deleted).map(a => ({
        id: a.id,
        googleId: a.google_id,
        staffId: a.staff_id,
        date: a.date,
        deletedAt: a.deleted_at
      })),
      payments: advances.filter(a => !a.is_deleted).map(a => ({
        id: a.id,
        googleId: a.google_id,
        staffId: a.staff_id,
        amount: a.amount,
        date: a.date,
        note: a.note || '',
        type: 'advance',
        isDeleted: !!a.is_deleted,
        deletedAt: a.deleted_at
      })),
      deletedPayments: advances.filter(a => a.is_deleted).map(a => ({
        id: a.id,
        googleId: a.google_id,
        staffId: a.staff_id,
        amount: a.amount,
        date: a.date,
        deletedAt: a.deleted_at
      })),
      settings: {
        ...settingsObj,
        userPlan: planData.userPlan || 'free',
        planExpiry: planData.planExpiry,
      },
      metadata: {
        lastModified: new Date().toISOString(),
        appVersion: '1.0.0',
        staffCount: staff.filter(s => !s.is_deleted).length,
        deletedStaffCount: staff.filter(s => s.is_deleted).length,
        attendanceCount: attendance.filter(a => !a.is_deleted).length,
        deletedAttendanceCount: attendance.filter(a => a.is_deleted).length,
        paymentCount: advances.filter(a => !a.is_deleted).length,
        deletedPaymentCount: advances.filter(a => a.is_deleted).length
      }
    };
    
    console.log('[JSONData] Export counts:', {
      staff: data.staff.length,
      deletedStaff: data.deletedStaff.length,
      attendance: data.attendance.length,
      deletedAttendance: data.deletedAttendance.length,
      payments: data.payments.length,
      deletedPayments: data.deletedPayments.length
    });
    
    return JSON.stringify(data, null, 2);
  } catch (queryError) {
    console.log('[JSONData] Export query error:', queryError.message);
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      staff: [],
      attendance: [],
      payments: [],
      settings: {},
      metadata: {
        lastModified: new Date().toISOString(),
        appVersion: '1.0.0'
      }
    });
  }
};

export const importFromJSON = async (jsonString, mergeMode = 'replace', targetGoogleId = null) => {
  let db;
  
  try {
    if (!isDBReady()) {
      db = await openDb();
    } else {
      db = getDB();
    }
  } catch (error) {
    console.log('[JSONData] DB not ready for import');
    throw new Error('Database not ready');
  }
  
  const data = JSON.parse(jsonString);
  const now = new Date().toISOString();
  
  await db.execAsync('BEGIN TRANSACTION');
  
  try {
    if (mergeMode === 'replace') {
      console.log('[JSONData] Restore mode: clearing existing data for google_id:', targetGoogleId);
      if (targetGoogleId) {
        await db.runAsync('DELETE FROM advances WHERE google_id = ?', [targetGoogleId]);
        await db.runAsync('DELETE FROM attendance WHERE google_id = ?', [targetGoogleId]);
        await db.runAsync('DELETE FROM staff WHERE google_id = ?', [targetGoogleId]);
      } else {
        await db.execAsync('DELETE FROM advances');
        await db.execAsync('DELETE FROM attendance');
        await db.execAsync('DELETE FROM staff');
      }
    }
    
    const staffIdMap = {};
    const remoteIdToGoogleIdMap = {};
    
    if (data.staff && Array.isArray(data.staff)) {
      console.log('[JSONData] Processing staff:', data.staff.length);
      for (const staffMember of data.staff) {
        const googleId = staffMember.googleId || targetGoogleId;
        const remoteId = staffMember.id;
        
        if (mergeMode === 'replace') {
          const result = await db.runAsync(
            `INSERT INTO staff (google_id, name, position, salary, salary_type, salary_start_date, salary_end_date, phone, join_date, sunday_holiday, note, is_deleted, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              googleId,
              staffMember.name,
              staffMember.position,
              staffMember.salary,
              staffMember.salaryType || 'monthly',
              staffMember.salaryStartDate || null,
              staffMember.salaryEndDate || null,
              staffMember.phone || '',
              staffMember.joinDate,
              staffMember.sundayHoliday ? 1 : 0,
              staffMember.note || '',
              staffMember.isDeleted ? 1 : 0,
              now
            ]
          );
          staffIdMap[remoteId] = result.lastInsertRowId;
          remoteIdToGoogleIdMap[remoteId] = googleId;
        } else {
          const existing = await db.getFirstAsync('SELECT id FROM staff WHERE (name = ? AND phone = ?) OR id = ?', 
            [staffMember.name, staffMember.phone || '', remoteId]);
          if (existing) {
            const localUpdated = existing.updated_at ? new Date(existing.updated_at) : new Date(0);
            const remoteUpdated = staffMember.updatedAt ? new Date(staffMember.updatedAt) : new Date(0);
            
            if (remoteUpdated > localUpdated) {
              await db.runAsync(
                `UPDATE staff SET name = ?, position = ?, salary = ?, salary_type = ?, salary_start_date = ?, 
                 salary_end_date = ?, phone = ?, join_date = ?, sunday_holiday = ?, note = ?, google_id = ?, updated_at = ?
                 WHERE id = ?`,
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
                  staffMember.note || '',
                  googleId,
                  now,
                  existing.id
                ]
              );
            }
            staffIdMap[remoteId] = existing.id;
          } else {
            const result = await db.runAsync(
              `INSERT INTO staff (google_id, id, name, position, salary, salary_type, salary_start_date, salary_end_date, phone, join_date, sunday_holiday, note, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                googleId,
                remoteId,
                staffMember.name,
                staffMember.position,
                staffMember.salary,
                staffMember.salaryType || 'monthly',
                staffMember.salaryStartDate || null,
                staffMember.salaryEndDate || null,
                staffMember.phone || '',
                staffMember.joinDate,
                staffMember.sundayHoliday ? 1 : 0,
                staffMember.note || '',
                now
              ]
            );
            staffIdMap[remoteId] = result.lastInsertRowId || remoteId;
          }
          remoteIdToGoogleIdMap[remoteId] = googleId;
        }
      }
      
      if (data.deletedStaff && Array.isArray(data.deletedStaff)) {
        console.log('[JSONData] Processing deleted staff:', data.deletedStaff.length);
        for (const deletedStaff of data.deletedStaff) {
          const googleId = deletedStaff.googleId || targetGoogleId;
          if (mergeMode === 'replace') {
            await db.runAsync(
              `INSERT OR REPLACE INTO staff (google_id, id, name, phone, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?)`,
              [googleId, deletedStaff.id, deletedStaff.name, deletedStaff.phone || '', 1, deletedStaff.deletedAt || now]
            );
          } else {
            await db.runAsync(
              `UPDATE staff SET is_deleted = 1, deleted_at = ? WHERE (id = ? OR (name = ? AND phone = ?))`,
              [deletedStaff.deletedAt || now, deletedStaff.id, deletedStaff.name, deletedStaff.phone || '']
            );
          }
        }
      }
    }
    
    if (data.attendance && Array.isArray(data.attendance)) {
      console.log('[JSONData] Processing attendance:', data.attendance.length);
      for (const att of data.attendance) {
        const newStaffId = staffIdMap[att.staffId];
        if (!newStaffId) continue;
        
        const googleId = att.googleId || targetGoogleId;
        
        if (mergeMode === 'replace') {
          await db.runAsync(
            `INSERT OR REPLACE INTO attendance (google_id, staff_id, date, status, note, is_deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [googleId, newStaffId, att.date, att.status, att.note || '', att.isDeleted ? 1 : 0, now]
          );
        } else {
          const existing = await db.getFirstAsync(
            'SELECT id FROM attendance WHERE staff_id = ? AND date = ?',
            [newStaffId, att.date]
          );
          if (!existing) {
            await db.runAsync(
              `INSERT INTO attendance (google_id, staff_id, date, status, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
              [googleId, newStaffId, att.date, att.status, att.note || '', now]
            );
          }
        }
      }
      
      if (data.deletedAttendance && Array.isArray(data.deletedAttendance)) {
        console.log('[JSONData] Processing deleted attendance:', data.deletedAttendance.length);
        for (const deletedAtt of data.deletedAttendance) {
          const googleId = deletedAtt.googleId || targetGoogleId;
          if (mergeMode === 'replace') {
            await db.runAsync(
              `INSERT OR REPLACE INTO attendance (google_id, id, staff_id, date, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?)`,
              [googleId, deletedAtt.id, staffIdMap[deletedAtt.staffId] || deletedAtt.staffId, deletedAtt.date, 1, deletedAtt.deletedAt || now]
            );
          } else {
            await db.runAsync(
              `UPDATE attendance SET is_deleted = 1, deleted_at = ? WHERE id = ?`,
              [deletedAtt.deletedAt || now, deletedAtt.id]
            );
          }
        }
      }
    }
    
    if (data.payments && Array.isArray(data.payments)) {
      console.log('[JSONData] Processing payments:', data.payments.length);
      for (const payment of data.payments) {
        const newStaffId = staffIdMap[payment.staffId];
        if (!newStaffId) continue;
        
        const googleId = payment.googleId || targetGoogleId;
        
        if (mergeMode === 'replace') {
          await db.runAsync(
            `INSERT OR REPLACE INTO advances (google_id, staff_id, amount, date, note, is_deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [googleId, newStaffId, payment.amount, payment.date, payment.note || '', payment.isDeleted ? 1 : 0, now]
          );
        } else {
          await db.runAsync(
            `INSERT INTO advances (google_id, staff_id, amount, date, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [googleId, newStaffId, payment.amount, payment.date, payment.note || '', now]
          );
        }
      }
      
      if (data.deletedPayments && Array.isArray(data.deletedPayments)) {
        console.log('[JSONData] Processing deleted payments:', data.deletedPayments.length);
        for (const deletedPayment of data.deletedPayments) {
          const googleId = deletedPayment.googleId || targetGoogleId;
          if (mergeMode === 'replace') {
            await db.runAsync(
              `INSERT OR REPLACE INTO advances (google_id, id, staff_id, amount, date, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [googleId, deletedPayment.id, staffIdMap[deletedPayment.staffId] || deletedPayment.staffId, deletedPayment.amount, deletedPayment.date, 1, deletedPayment.deletedAt || now]
            );
          } else {
            await db.runAsync(
              `UPDATE advances SET is_deleted = 1, deleted_at = ? WHERE id = ?`,
              [deletedPayment.deletedAt || now, deletedPayment.id]
            );
          }
        }
      }
    }
    
    await db.execAsync('COMMIT');
    
    console.log('[JSONData] Import complete, staff count:', data.staff?.length || 0);
    return { success: true, staffCount: data.staff?.length || 0 };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.log('[JSONData] Import error:', error.message);
    throw error;
  }
};

export const getStaffCount = async () => {
  try {
    if (!isDBReady()) return 0;
    const db = getDB();
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM staff');
    return result?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const getAttendanceCount = async () => {
  try {
    if (!isDBReady()) return 0;
    const db = getDB();
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM attendance');
    return result?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const getPaymentCount = async () => {
  try {
    if (!isDBReady()) return 0;
    const db = getDB();
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM advances');
    return result?.count || 0;
  } catch (error) {
    return 0;
  }
};

export const getAllStaffActive = async () => {
  try {
    if (!isDBReady()) return [];
    const db = getDB();
    return await db.getAllAsync('SELECT * FROM staff WHERE is_deleted = 0 ORDER BY id');
  } catch (error) {
    console.log('[JSONData] getAllStaffActive error:', error.message);
    return [];
  }
};

export const getAllAttendanceActive = async () => {
  try {
    if (!isDBReady()) return [];
    const db = getDB();
    return await db.getAllAsync('SELECT * FROM attendance WHERE is_deleted = 0 ORDER BY date');
  } catch (error) {
    console.log('[JSONData] getAllAttendanceActive error:', error.message);
    return [];
  }
};

export const getAllPaymentsActive = async () => {
  try {
    if (!isDBReady()) return [];
    const db = getDB();
    return await db.getAllAsync('SELECT * FROM advances WHERE is_deleted = 0 ORDER BY date');
  } catch (error) {
    console.log('[JSONData] getAllPaymentsActive error:', error.message);
    return [];
  }
};

export const softDeleteStaff = async (id) => {
  try {
    if (!isDBReady()) throw new Error('Database not ready');
    const db = getDB();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE staff SET is_deleted = 1, deleted_at = ? WHERE id = ?',
      [now, id]
    );
    console.log('[JSONData] Soft delete staff:', id);
    return true;
  } catch (error) {
    console.log('[JSONData] softDeleteStaff error:', error.message);
    throw error;
  }
};

export const softDeleteAttendance = async (id) => {
  try {
    if (!isDBReady()) throw new Error('Database not ready');
    const db = getDB();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE attendance SET is_deleted = 1, deleted_at = ? WHERE id = ?',
      [now, id]
    );
    console.log('[JSONData] Soft delete attendance:', id);
    return true;
  } catch (error) {
    console.log('[JSONData] softDeleteAttendance error:', error.message);
    throw error;
  }
};

export const softDeletePayment = async (id) => {
  try {
    if (!isDBReady()) throw new Error('Database not ready');
    const db = getDB();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE advances SET is_deleted = 1, deleted_at = ? WHERE id = ?',
      [now, id]
    );
    console.log('[JSONData] Soft delete payment:', id);
    return true;
  } catch (error) {
    console.log('[JSONData] softDeletePayment error:', error.message);
    throw error;
  }
};

export const addStaffWithGoogleId = async (staffData, googleId) => {
  try {
    if (!isDBReady()) throw new Error('Database not ready');
    const db = getDB();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO staff (google_id, name, position, salary, salary_type, salary_start_date, salary_end_date, phone, join_date, sunday_holiday, note, is_deleted, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        googleId,
        staffData.name,
        staffData.position,
        staffData.salary,
        staffData.salaryType || 'monthly',
        staffData.salaryStartDate || null,
        staffData.salaryEndDate || null,
        staffData.phone || '',
        staffData.joinDate,
        staffData.sundayHoliday ? 1 : 0,
        staffData.note || '',
        0,
        now
      ]
    );
    console.log('[JSONData] addStaffWithGoogleId:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.log('[JSONData] addStaffWithGoogleId error:', error.message);
    throw error;
  }
};