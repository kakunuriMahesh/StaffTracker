import * as SQLite from 'expo-sqlite';

let db = null;
let isReady = false;
let initPromise = null;

const DATABASE_NAME = 'userdata.db';

async function openDb() {
  if (db && isReady) {
    return db;
  }
  
  console.log('[UserDB] Opening database:', DATABASE_NAME);
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  console.log('[UserDB] Database opened successfully');
  return db;
}

async function initializeTables(database) {
  try {
    console.log('[UserDB] Creating tables...');
    
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        photo_url TEXT,
        id_token TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[UserDB] Users table ready');
    
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[UserDB] Notes table ready');
    
    console.log('[UserDB] All tables ready');
  } catch (e) {
    console.error('[UserDB] Table creation error:', e);
    throw e;
  }
}

function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

export async function initUserDB() {
  if (isReady && db) {
    return db;
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    try {
      console.log('[UserDB] Starting initialization...');
      var database = await openDb();
      await initializeTables(database);
      isReady = true;
      console.log('[UserDB] Initialization complete');
      return db;
    } catch (e) {
      console.error('[UserDB] Init failed:', e);
      isReady = false;
      db = null;
      initPromise = null;
      throw e;
    }
  })();
  
  return initPromise;
}

async function getDbConnection() {
  await initUserDB();
  
  if (!db) {
    throw new Error('User database not available');
  }
  
  return db;
}

async function getDbWithRetry(maxRetries) {
  if (!maxRetries) maxRetries = 3;
  var lastError = null;
  
  for (var i = 0; i < maxRetries; i++) {
    try {
      var database = await getDbConnection();
      if (database) {
        return database;
      }
    } catch (e) {
      lastError = e;
      console.log('[UserDB] Retry ' + (i + 1) + '/' + maxRetries + ':', e.message);
      if (i < maxRetries - 1) {
        await sleep(100 * (i + 1));
        db = null;
        isInitialized = false;
      }
    }
  }
  
  throw lastError || new Error('Failed to get user database');
}

export async function saveUser(googleUser) {
  var database = await getDbWithRetry();
  try {
    if (!googleUser.google_id) {
      throw new Error('google_id is required');
    }
    await database.runAsync(
      'INSERT OR REPLACE INTO users (google_id, email, name, photo_url, id_token, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
      [
        googleUser.google_id,
        googleUser.email,
        googleUser.name,
        googleUser.photo || null,
        googleUser.idToken || googleUser.accessToken || null
      ]
    );
    console.log('[UserDB] User saved:', googleUser.email);
    return true;
  } catch (e) {
    console.error('[UserDB] saveUser error:', e);
    throw e;
  }
}

export async function getUserByGoogleId(googleId) {
  var database = await getDbWithRetry();
  try {
    var user = await database.getFirstAsync('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
    return user || null;
  } catch (e) {
    console.error('[UserDB] getUserByGoogleId error:', e);
    return null;
  }
}

export async function getCurrentUser() {
  var database = await getDbWithRetry();
  try {
    var user = await database.getFirstAsync('SELECT * FROM users ORDER BY id DESC LIMIT 1');
    return user || null;
  } catch (e) {
    console.error('[UserDB] getCurrentUser error:', e);
    return null;
  }
}

export async function getUser(googleId) {
  var database = await getDbWithRetry();
  try {
    if (googleId) {
      return await database.getFirstAsync('SELECT * FROM users WHERE google_id = ?', [googleId]);
    }
    return await getCurrentUser();
  } catch (e) {
    console.error('[UserDB] getUser error:', e);
    return null;
  }
}

export async function deleteUser(googleId) {
  var database = await getDbWithRetry();
  try {
    var user = await database.getFirstAsync('SELECT id FROM users WHERE google_id = ?', [googleId]);
    if (user) {
      await database.runAsync('DELETE FROM notes WHERE user_id = ?', [user.id]);
      await database.runAsync('DELETE FROM users WHERE google_id = ?', [googleId]);
      console.log('[UserDB] User deleted:', googleId);
    }
  } catch (e) {
    console.error('[UserDB] deleteUser error:', e);
  }
}

export async function saveNote(note) {
  var database = await getDbWithRetry();
  try {
    var result = await database.runAsync(
      'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
      [note.userId, note.title, note.content || '']
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error('[UserDB] saveNote error:', e);
    throw e;
  }
}

export async function getNotes(userId) {
  var database = await getDbWithRetry();
  try {
    if (userId) {
      return await database.getAllAsync(
        'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
    }
    return await database.getAllAsync('SELECT * FROM notes ORDER BY created_at DESC');
  } catch (e) {
    console.error('[UserDB] getNotes error:', e);
    return [];
  }
}

export async function deleteNote(noteId) {
  var database = await getDbWithRetry();
  try {
    await database.runAsync('DELETE FROM notes WHERE id = ?', [noteId]);
  } catch (e) {
    console.error('[UserDB] deleteNote error:', e);
  }
}