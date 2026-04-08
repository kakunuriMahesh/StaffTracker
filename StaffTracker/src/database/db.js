import * as SQLite from 'expo-sqlite';

let db;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('stafftracker.db');
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      salary REAL NOT NULL,
      salary_type TEXT DEFAULT 'monthly',
      salary_start_date TEXT,
      salary_end_date TEXT,
      phone TEXT,
      join_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );
  `);
  
  try {
    await db.runAsync('ALTER TABLE staff ADD COLUMN salary_type TEXT DEFAULT "monthly"');
  } catch (e) {}
  try {
    await db.runAsync('ALTER TABLE staff ADD COLUMN salary_start_date TEXT');
  } catch (e) {}
  try {
    await db.runAsync('ALTER TABLE staff ADD COLUMN salary_end_date TEXT');
  } catch (e) {}
  
  return db;
};

export const getDb = () => db;

export const addStaff = async (name, position, salary, phone, joinDate, salaryType = 'monthly', salaryStartDate = null, salaryEndDate = null) => {
  const result = await db.runAsync(
    'INSERT INTO staff (name, position, salary, salary_type, salary_start_date, salary_end_date, phone, join_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, position, salary, salaryType, salaryStartDate, salaryEndDate, phone, joinDate]
  );
  return result.lastInsertRowId;
};

export const getAllStaff = async () => {
  return await db.getAllAsync('SELECT * FROM staff ORDER BY name');
};

export const getStaffById = async (id) => {
  return await db.getFirstAsync('SELECT * FROM staff WHERE id = ?', [id]);
};

export const updateStaff = async (id, name, position, salary, phone, salaryType = 'monthly', salaryStartDate = null, salaryEndDate = null) => {
  await db.runAsync(
    'UPDATE staff SET name = ?, position = ?, salary = ?, phone = ?, salary_type = ?, salary_start_date = ?, salary_end_date = ? WHERE id = ?',
    [name, position, salary, phone, salaryType, salaryStartDate, salaryEndDate, id]
  );
};

export const deleteStaff = async (id) => {
  await db.runAsync('DELETE FROM advances WHERE staff_id = ?', [id]);
  await db.runAsync('DELETE FROM attendance WHERE staff_id = ?', [id]);
  await db.runAsync('DELETE FROM staff WHERE id = ?', [id]);
};

export const markAttendance = async (staffId, date, status) => {
  const existing = await db.getFirstAsync(
    'SELECT id FROM attendance WHERE staff_id = ? AND date = ?',
    [staffId, date]
  );
  
  if (existing) {
    await db.runAsync(
      'UPDATE attendance SET status = ? WHERE staff_id = ? AND date = ?',
      [status, staffId, date]
    );
  } else {
    await db.runAsync(
      'INSERT INTO attendance (staff_id, date, status) VALUES (?, ?, ?)',
      [staffId, date, status]
    );
  }
};

export const getAttendanceByDate = async (date) => {
  return await db.getAllAsync(
    'SELECT a.*, s.name, s.position FROM attendance a JOIN staff s ON a.staff_id = s.id WHERE a.date = ?',
    [date]
  );
};

export const getAttendanceByStaffAndMonth = async (staffId, year, month) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  return await db.getAllAsync(
    'SELECT * FROM attendance WHERE staff_id = ? AND date >= ? AND date <= ? ORDER BY date',
    [staffId, startDate, endDate]
  );
};

export const getAttendanceByDateRange = async (staffId, startDate, endDate) => {
  return await db.getAllAsync(
    'SELECT * FROM attendance WHERE staff_id = ? AND date >= ? AND date <= ? ORDER BY date',
    [staffId, startDate, endDate]
  );
};

export const getMonthlySummary = async (year, month) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  return await db.getAllAsync(`
    SELECT s.id, s.name, s.position, s.salary,
      SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'A' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN a.status = 'L' THEN 1 ELSE 0 END) as leave
    FROM staff s
    LEFT JOIN attendance a ON s.id = a.staff_id AND a.date >= ? AND a.date <= ?
    GROUP BY s.id
    ORDER BY s.name
  `, [startDate, endDate]);
};

export const addAdvance = async (staffId, amount, date, note) => {
  await db.runAsync(
    'INSERT INTO advances (staff_id, amount, date, note) VALUES (?, ?, ?, ?)',
    [staffId, amount, date, note || '']
  );
};

export const deleteAdvance = async (id) => {
  await db.runAsync('DELETE FROM advances WHERE id = ?', [id]);
};

export const getMonthlyAdvances = async (staffId, year, month) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  return await db.getAllAsync(
    'SELECT * FROM advances WHERE staff_id = ? AND date >= ? AND date <= ? ORDER BY date',
    [staffId, startDate, endDate]
  );
};

export const getAdvancesByDateRange = async (staffId, startDate, endDate) => {
  return await db.getAllAsync(
    'SELECT * FROM advances WHERE staff_id = ? AND date >= ? AND date <= ? ORDER BY date',
    [staffId, startDate, endDate]
  );
};

export const getAdvancesForStaff = async (staffId) => {
  return await db.getAllAsync(
    'SELECT * FROM advances WHERE staff_id = ? ORDER BY date DESC',
    [staffId]
  );
};