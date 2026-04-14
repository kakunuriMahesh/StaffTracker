import { getAccessToken } from '../auth/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { 
  downloadJSON, 
  uploadJSON, 
  saveToLocalCache, 
  loadFromLocalCache
} from './driveService';
import { exportToJSON, importFromJSON } from './jsonDataService';
import dayjs from 'dayjs';

let authStorage = {
  data: {},
  setItem: async (key, value) => {
    authStorage.data[key] = value;
  },
  getItem: async (key) => {
    return authStorage.data[key] || null;
  },
  deleteItem: async (key) => {
    delete authStorage.data[key];
  }
};

try {
  const SecureStore = require('expo-secure-store');
  authStorage = {
    setItem: SecureStore.setItemAsync.bind(SecureStore),
    getItem: SecureStore.getItemAsync.bind(SecureStore),
    deleteItem: SecureStore.deleteItemAsync.bind(SecureStore)
  };
} catch (e) {
  console.log('expo-secure-store not available');
}

const SYNC_SETTINGS_KEY = 'stafftracker_sync_settings';
const PENDING_CHANGES_KEY = 'stafftracker_pending_changes';
const LAST_SYNC_KEY = 'stafftracker_last_sync';

const SYNC_FREQUENCY = {
  REALTIME: 'realtime',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

const DEFAULT_SETTINGS = {
  syncFrequency: SYNC_FREQUENCY.DAILY,
  syncOnWifiOnly: false,
  autoSync: true,
  notifyOnSync: true,
};

let syncListeners = new Set();
let isSyncing = false;
let scheduledSyncTimer = null;

export const getSyncSettings = async () => {
  try {
    const settingsJson = await authStorage.getItem(SYNC_SETTINGS_KEY);
    if (!settingsJson) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSyncSettings = async (settings) => {
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  await authStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(mergedSettings));
  await setupScheduledSync(mergedSettings);
  return mergedSettings;
};

export const addSyncListener = (callback) => {
  syncListeners.add(callback);
};

export const removeSyncListener = (callback) => {
  syncListeners.delete(callback);
};

const notifyListeners = (event) => {
  syncListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('Sync listener error:', error);
    }
  });
};

export const getLastSyncTime = async () => {
  try {
    const lastSync = await authStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    return null;
  }
};

export const setLastSyncTime = async () => {
  await authStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
};

const getFreshToken = async () => {
  try {
    console.log('[Sync] Fetching fresh token from Google...');
    const tokens = await GoogleSignin.getTokens();
    if (!tokens.accessToken) {
      console.log('[Sync] No fresh access token available');
      return null;
    }
    console.log('[Sync] Fresh token obtained');
    return tokens.accessToken;
  } catch (error) {
    console.log('[Sync] Failed to get fresh token:', error.message);
    return null;
  }
};

export const syncData = async (forceUpload = false) => {
  if (isSyncing) {
    return { success: false, reason: 'already_syncing' };
  }
  
  isSyncing = true;
  notifyListeners({ type: 'sync_start' });
  
  let accessToken = null;
  try {
    console.log('[Sync] Starting sync...');
    
    const { initJsonDatabase, isDBReady } = await import('./jsonDataService');
    
    if (!isDBReady()) {
      console.log('[Sync] Database initializing...');
      try {
        await initJsonDatabase();
      } catch (dbError) {
        console.log('[Sync] DB init error (will try export anyway):', dbError.message);
      }
    }
    
    if (!isDBReady()) {
      console.log('[Sync] DB not ready, using empty data');
      const localData = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        staff: [],
        attendance: [],
        payments: [],
        settings: {},
        metadata: { lastModified: new Date().toISOString(), appVersion: '1.0.0' }
      });
      accessToken = await getFreshToken();
      if (!accessToken) {
        isSyncing = false;
        return { success: false, error: 'session_expired' };
      }
      console.log('[Sync] Uploading empty data (no DB)...');
      const result = await uploadJSON(accessToken, localData);
      if (result) {
        isSyncing = false;
        return { success: true };
      }
    }
    
    accessToken = await getFreshToken();
    if (!accessToken) {
      console.log('[Sync] No valid token - not logged in');
      isSyncing = false;
      return { success: false, error: 'session_expired' };
    }
    console.log('[Sync] Token available');
    
    console.log('[Sync] Getting local data...');
    const localData = await exportToJSON();
    console.log('[Sync] Local data exported, size:', localData?.length);
    
    try {
      await saveToLocalCache(localData);
    } catch (cacheError) {
      console.log('[Sync] Cache save skipped:', cacheError.message);
    }
    
    let remoteData = null;
    let fileNotFound = false;
    try {
      remoteData = await downloadJSON(accessToken);
      console.log('[Sync] Remote data fetched:', !!remoteData);
    } catch (error) {
      console.log('[Sync] No remote data (first time upload):', error.message);
      fileNotFound = true;
    }
    
    let mergedData = localData;
    
    if (remoteData && !forceUpload && !fileNotFound) {
      try {
        const localModified = new Date(JSON.parse(localData).metadata.lastModified);
        const remoteModified = new Date(JSON.parse(remoteData).metadata.lastModified);
        
        if (remoteModified > localModified) {
          mergedData = remoteData;
          await importFromJSON(mergedData, 'replace');
          try {
            await saveToLocalCache(mergedData);
          } catch (cacheError) {
            console.log('[Sync] Cache update skipped:', cacheError.message);
          }
        }
      } catch (parseError) {
        console.log('[Sync] Parse error, using local:', parseError.message);
      }
    }
    
    console.log('[Sync] Uploading data to Drive...');
    const uploadResult = await uploadJSON(accessToken, mergedData);
    if (!uploadResult) {
      console.log('[Sync] Upload failed');
      accessToken = await getFreshToken();
      if (accessToken) {
        console.log('[Sync] Retrying with fresh token...');
        await uploadJSON(accessToken, mergedData);
      }
    }
    await setLastSyncTime();
    await clearPendingChanges();
    
    isSyncing = false;
    notifyListeners({ 
      type: 'sync_complete', 
      timestamp: new Date(),
      staffCount: JSON.parse(mergedData).staff?.length || 0
    });
    
    return { success: true };
  } catch (error) {
    console.log('[Sync] Overall error:', error.message);
    isSyncing = false;
    
    try {
      await queuePendingChange('sync');
    } catch (queueError) {
      console.log('[Sync] Queue skipped:', queueError.message);
    }
    
    notifyListeners({ 
      type: 'sync_error', 
      error: error.message 
    });
    
    return { success: false, error: error.message };
  }
};

export const syncDataSafe = async (forceUpload = false) => {
  return await syncData(forceUpload);
};

export const loadRemoteData = async () => {
  try {
    const accessToken = await getFreshToken();
    if (!accessToken) {
      throw new Error('No access token');
    }
    
    const remoteData = await downloadJSON(accessToken);
    
    if (!remoteData) {
      return { success: true, data: null, isNew: false };
    }
    
    await importFromJSON(remoteData, 'replace');
    await saveToLocalCache(remoteData);
    
    return { success: true, data: JSON.parse(remoteData), isNew: true };
  } catch (error) {
    const cachedData = await loadFromLocalCache();
    if (cachedData) {
      return { success: true, data: JSON.parse(cachedData), isNew: false, fromCache: true };
    }
    return { success: false, error: error.message };
  }
};

export const queuePendingChange = async (changeType) => {
  try {
    const pendingJson = await authStorage.getItem(PENDING_CHANGES_KEY);
    const pending = pendingJson ? JSON.parse(pendingJson) : [];
    
    const existingIndex = pending.findIndex(p => p.type === changeType);
    if (existingIndex >= 0) {
      pending[existingIndex].timestamp = new Date().toISOString();
    } else {
      pending.push({ type: changeType, timestamp: new Date().toISOString() });
    }
    
    await authStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('Queue pending change error:', error);
  }
};

export const getPendingChanges = async () => {
  try {
    const pendingJson = await authStorage.getItem(PENDING_CHANGES_KEY);
    return pendingJson ? JSON.parse(pendingJson) : [];
  } catch (error) {
    return [];
  }
};

export const clearPendingChanges = async () => {
  await authStorage.deleteItem(PENDING_CHANGES_KEY);
};

const setupScheduledSync = async (settings) => {
  if (scheduledSyncTimer) {
    clearTimeout(scheduledSyncTimer);
    scheduledSyncTimer = null;
  }
  
  if (settings.syncFrequency === SYNC_FREQUENCY.REALTIME) {
    return;
  }
  
  const now = dayjs();
  let nextSync;
  
  switch (settings.syncFrequency) {
    case SYNC_FREQUENCY.DAILY:
      nextSync = now.add(1, 'day').hour(0).minute(0).second(0);
      break;
    case SYNC_FREQUENCY.WEEKLY:
      nextSync = now.add(1, 'week').day(0).hour(0).minute(0).second(0);
      break;
    case SYNC_FREQUENCY.MONTHLY:
      nextSync = now.add(1, 'month').date(1).hour(0).minute(0).second(0);
      break;
    default:
      return;
  }
  
  const msUntilSync = nextSync.diff(now);
  
  scheduledSyncTimer = setTimeout(async () => {
    await syncData();
    const currentSettings = await getSyncSettings();
    await setupScheduledSync(currentSettings);
  }, msUntilSync);
};

export const initSyncManager = async () => {
  const settings = await getSyncSettings();
  await setupScheduledSync(settings);
};

export const stopSyncManager = async () => {
  if (scheduledSyncTimer) {
    clearTimeout(scheduledSyncTimer);
    scheduledSyncTimer = null;
  }
};

export { SYNC_FREQUENCY };