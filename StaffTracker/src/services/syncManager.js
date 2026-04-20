import { getAccessToken } from '../auth/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { 
  downloadJSON, 
  uploadJSON, 
  saveToLocalCache, 
  loadFromLocalCache
} from './driveService';
import { exportToJSON as exportFromDB, importFromJSON as importToDB } from '../database/db';
import { initDatabase } from '../database/db';
import { getCurrentUser } from '../database/userDb';
import { Alert } from 'react-native';
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

export const manualSync = async (onSyncChoice) => {
  if (isSyncing) {
    return { success: false, reason: 'already_syncing' };
  }
  
  isSyncing = true;
  notifyListeners({ type: 'sync_start' });
  
  let accessToken = null;
  let currentUser = null;
  
  try {
    console.log('[ManualSync] Starting manual sync...');
    
    currentUser = await getCurrentUser();
    const googleId = currentUser?.google_id || null;
    console.log('[ManualSync] User google_id:', googleId);
    
    try {
      await initDatabase();
    } catch (dbError) {
      console.log('[ManualSync] DB init error:', dbError.message);
    }
    
    accessToken = await getFreshToken();
    if (!accessToken) {
      console.log('[ManualSync] No valid token - not logged in');
      isSyncing = false;
      return { success: false, error: 'session_expired' };
    }
    console.log('[ManualSync] Token available');
    
    console.log('[ManualSync] Getting local data...');
    const localData = await exportFromDB(googleId);
    const localParsed = JSON.parse(localData);
    console.log('[ManualSync] Local data exported:', {
      staff: localParsed.metadata?.staffCount || 0,
      attendance: localParsed.metadata?.attendanceCount || 0,
      payments: localParsed.metadata?.paymentCount || 0,
      deletedStaff: localParsed.metadata?.deletedStaffCount || 0
    });
    
    let remoteData = null;
    let fileNotFound = false;
    try {
      remoteData = await downloadJSON(accessToken, googleId);
      console.log('[ManualSync] Remote data fetched:', !!remoteData);
    } catch (error) {
      console.log('[ManualSync] No remote data (first time):', error.message);
      fileNotFound = true;
    }
    
    if (remoteData && !fileNotFound) {
      const remoteParsed = JSON.parse(remoteData);
      console.log('[ManualSync] Remote data:', {
        staff: remoteParsed.metadata?.staffCount || 0,
        attendance: remoteParsed.metadata?.attendanceCount || 0,
        payments: remoteParsed.metadata?.paymentCount || 0,
        deletedStaff: remoteParsed.metadata?.deletedStaffCount || 0
      });
      
      isSyncing = false;
      
      if (onSyncChoice) {
        const choice = await onSyncChoice(remoteParsed);
        
        if (choice === 'cancel') {
          console.log('[ManualSync] User cancelled');
          notifyListeners({ type: 'sync_cancelled' });
          return { success: true, cancelled: true };
        }
        
        isSyncing = true;
        
        if (choice === 'restore') {
          console.log('[ManualSync] User chose Restore (replace)');
          await importToDB(remoteData, 'replace', googleId);
          
          console.log('[ManualSync] Restore complete, now re-uploading to Drive...');
          
          accessToken = await getFreshToken();
          if (accessToken) {
            const restoredData = await exportFromDB(googleId);
            try {
              await saveToLocalCache(restoredData, googleId);
            } catch (cacheError) {
              console.log('[ManualSync] Cache update skipped:', cacheError.message);
            }
            await uploadJSON(accessToken, restoredData, googleId);
            console.log('[ManualSync] Restored data uploaded to Drive');
          }
        } else if (choice === 'merge') {
          console.log('[ManualSync] User chose Merge');
          await importToDB(remoteData, 'merge', googleId);
          
          console.log('[ManualSync] Merge complete, now re-uploading to Drive...');
          
          accessToken = await getFreshToken();
          if (accessToken) {
            const mergedData = await exportFromDB(googleId);
            try {
              await saveToLocalCache(mergedData, googleId);
            } catch (cacheError) {
              console.log('[ManualSync] Cache update skipped:', cacheError.message);
            }
            await uploadJSON(accessToken, mergedData, googleId);
            console.log('[ManualSync] Merged data uploaded to Drive');
          }
        }
      }
    } else {
      const staffCount = localParsed.metadata?.staffCount || 0;
      const attendanceCount = localParsed.metadata?.attendanceCount || 0;
      const paymentCount = localParsed.metadata?.paymentCount || 0;
      
      if (staffCount === 0 && attendanceCount === 0 && paymentCount === 0) {
        console.log('[ManualSync] WARNING: Local data is empty, skipping upload');
        isSyncing = false;
        notifyListeners({ type: 'sync_complete', timestamp: new Date() });
        return { success: true, skipped: true, reason: 'empty_data' };
      }
      
      console.log('[ManualSync] Uploading local data to Drive, counts:', { staffCount, attendanceCount, paymentCount });
      const uploadResult = await uploadJSON(accessToken, localData, googleId);
      if (!uploadResult) {
        console.log('[ManualSync] Upload failed, retrying...');
        accessToken = await getFreshToken();
        if (accessToken) {
          await uploadJSON(accessToken, localData, googleId);
        }
      }
      
      await setLastSyncTime();
      await clearPendingChanges();
      
      isSyncing = false;
      notifyListeners({ 
        type: 'sync_complete', 
        timestamp: new Date(),
        staffCount: localParsed.metadata?.staffCount || 0
      });
      
      return { success: true, uploaded: true };
    }
    
    await setLastSyncTime();
    await clearPendingChanges();
    
    isSyncing = false;
    notifyListeners({ 
      type: 'sync_complete', 
      timestamp: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.log('[ManualSync] Overall error:', error.message);
    isSyncing = false;
    
    try {
      await queuePendingChange('manual_sync');
    } catch (queueError) {
      console.log('[ManualSync] Queue skipped:', queueError.message);
    }
    
    notifyListeners({ 
      type: 'sync_error', 
      error: error.message 
    });
    
    return { success: false, error: error.message };
  }
};

export const syncData = async (forceUpload = false) => {
  if (isSyncing) {
    return { success: false, reason: 'already_syncing' };
  }
  
  isSyncing = true;
  notifyListeners({ type: 'sync_start' });
  
  let accessToken = null;
  let currentUser = null;
  
  try {
    console.log('[Sync] Starting sync...');
    
    currentUser = await getCurrentUser();
    const googleId = currentUser?.google_id || null;
    console.log('[Sync] User google_id:', googleId);
    
    try {
      await initDatabase();
      console.log('[Sync] Database initialized');
    } catch (dbError) {
      console.log('[Sync] DB init error:', dbError.message);
    }
    
    accessToken = await getFreshToken();
    if (!accessToken) {
      console.log('[Sync] No valid token - not logged in');
      isSyncing = false;
      return { success: false, error: 'session_expired' };
    }
    console.log('[Sync] Token available');
    
    console.log('[Sync] Getting local data...');
    const localData = await exportFromDB(googleId);
    const localParsed = JSON.parse(localData);
    console.log('[Sync] Local data exported, staff:', localParsed.metadata?.staffCount || 0);
    
    try {
      await saveToLocalCache(localData, googleId);
    } catch (cacheError) {
      console.log('[Sync] Cache save skipped:', cacheError.message);
    }
    
    let remoteData = null;
    let fileNotFound = false;
    try {
      remoteData = await downloadJSON(accessToken, googleId);
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
          await importToDB(mergedData, 'replace', googleId);
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
    
    const staffCount = localParsed.metadata?.staffCount || 0;
    const attendanceCount = localParsed.metadata?.attendanceCount || 0;
    const paymentCount = localParsed.metadata?.paymentCount || 0;
    const remoteStaffCount = remoteData ? JSON.parse(remoteData).metadata?.staffCount || 0 : 0;
    
    console.log('[Sync] Sync decision:', {
      localStaff: staffCount,
      localAttendance: attendanceCount,
      localPayments: paymentCount,
      remoteStaff: remoteStaffCount
    });
    
    const hasLocalData = staffCount > 0 || attendanceCount > 0 || paymentCount > 0;
    const hasRemoteData = remoteStaffCount > 0;
    
    if (!hasLocalData && !hasRemoteData) {
      console.log('[Sync] No data to sync - both local and remote empty');
      isSyncing = false;
      notifyListeners({ type: 'sync_complete', timestamp: new Date() });
      return { success: true, skipped: true, reason: 'no_data' };
    }
    
    if (hasLocalData) {
      console.log('[Sync] Uploading data to Drive, counts:', { staffCount, attendanceCount, paymentCount });
      const uploadResult = await uploadJSON(accessToken, mergedData, googleId);
      if (!uploadResult) {
        console.log('[Sync] Upload failed, retrying...');
        accessToken = await getFreshToken();
        if (accessToken) {
          await uploadJSON(accessToken, mergedData, googleId);
        }
      }
    } else if (hasRemoteData && !forceUpload) {
      console.log('[Sync] Remote has data, local empty - auto restore');
      mergedData = remoteData;
      await importToDB(mergedData, 'replace', googleId);
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
    
    const currentUser = await getCurrentUser();
    const googleId = currentUser?.google_id || null;
    
    const remoteData = await downloadJSON(accessToken, googleId);
    
    if (!remoteData) {
      return { success: true, data: null, isNew: false };
    }
    
    await importToDB(remoteData, 'replace', googleId);
    await saveToLocalCache(remoteData, googleId);
    
    return { success: true, data: JSON.parse(remoteData), isNew: true };
  } catch (error) {
    const cachedData = await loadFromLocalCache(googleId);
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