import * as SQLite from 'expo-sqlite';
import dayjs from 'dayjs';

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
        name TEXT NOT NULL,
        position TEXT,
        salary REAL DEFAULT 0,
        salary_type TEXT DEFAULT 'monthly',
        salary_start_date TEXT,
        salary_end_date TEXT,
        phone TEXT,
        join_date TEXT,
        sunday_holiday INTEGER DEFAULT 0,
        note TEXT
      )
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        date TEXT,
        status TEXT,
        note TEXT,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS advances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        amount REAL,
        date TEXT,
        note TEXT,
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
    
    isInitialized = true;
    initError = null;
    console.log('[JSONData] Tables initialized successfully');
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

export const exportToJSON = async () => {
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

export const importFromJSON = async (jsonString, mergeMode = 'replace') => {
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
              [newStaffId, att.date, att.status, att.note || '']
            );
          }
        }
      }
    }
    
    if (data.payments && Array.isArray(data.payments)) {
      for (const payment of data.payments) {
        const newStaffId = staffIdMap[payment.staffId];
        if (!newStaffId) continue;
        
        await db.runAsync(
          `INSERT INTO advances (staff_id, amount, date, note) VALUES (?, ?, ?, ?)`,
          [newStaffId, payment.amount, payment.date, payment.note || '']
        );
      }
    }
    
    await db.execAsync('COMMIT');
    
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