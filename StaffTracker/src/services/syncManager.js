import { getAccessToken } from '../auth/authService';
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

export const syncData = async (forceUpload = false) => {
  if (isSyncing) {
    return { success: false, reason: 'already_syncing' };
  }
  
  isSyncing = true;
  notifyListeners({ type: 'sync_start' });
  
  try {
    let accessToken = await getAccessToken();
    if (!accessToken) {
      console.log('No access token - not logged in, skipping sync');
      isSyncing = false;
      return { success: false, error: 'not_logged_in' };
    }
    
    const localData = await exportToJSON();
    await saveToLocalCache(localData);
    
    let remoteData = null;
    try {
      remoteData = await downloadJSON(accessToken);
    } catch (error) {
      console.log('No remote data found or download error');
    }
    
    let mergedData = localData;
    
    if (remoteData && !forceUpload) {
      const localModified = new Date(JSON.parse(localData).metadata.lastModified);
      const remoteModified = new Date(JSON.parse(remoteData).metadata.lastModified);
      
      if (remoteModified > localModified) {
        mergedData = remoteData;
        await importFromJSON(mergedData, 'replace');
        await saveToLocalCache(mergedData);
      }
    }
    
    await uploadJSON(accessToken, mergedData);
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
    isSyncing = false;
    await queuePendingChange('sync');
    notifyListeners({ 
      type: 'sync_error', 
      error: error.message 
    });
    return { success: false, error: error.message };
  }
};

export const loadRemoteData = async () => {
  try {
    const accessToken = await getAccessToken();
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