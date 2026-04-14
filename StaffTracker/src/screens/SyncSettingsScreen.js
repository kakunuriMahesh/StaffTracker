import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSyncSettings, saveSyncSettings, SYNC_FREQUENCY, manualSync, getLastSyncTime } from '../services/syncManager';
import { logout as authLogout, isAuthenticated } from '../auth/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getCurrentUser, deleteUser } from '../database/userDb';

export default function SyncSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadSettings();
    checkLoginStatus();
    loadUserInfo();
  }, []);

  const checkLoginStatus = async () => {
    const loggedIn = await isAuthenticated();
    setIsLoggedIn(loggedIn);
  };

  const loadUserInfo = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      console.log('[SyncSettings] User loaded:', user?.email, user?.google_id);
    } catch (error) {
      console.log('[SyncSettings] Error loading user:', error.message);
    }
  };

  const loadSettings = async () => {
    const loadedSettings = await getSyncSettings();
    setSettings(loadedSettings);
    
    const lastSyncTime = await getLastSyncTime();
    setLastSync(lastSyncTime);
  };

  const handleSyncFrequencyChange = async (value) => {
    const newSettings = await saveSyncSettings({ ...settings, syncFrequency: value });
    setSettings(newSettings);
  };

  const handleWifiOnlyChange = async (value) => {
    const newSettings = await saveSyncSettings({ ...settings, syncOnWifiOnly: value });
    setSettings(newSettings);
  };

  const handleAutoSyncChange = async (value) => {
    const newSettings = await saveSyncSettings({ ...settings, autoSync: value });
    setSettings(newSettings);
  };

  const handleNotifyChange = async (value) => {
    const newSettings = await saveSyncSettings({ ...settings, notifyOnSync: value });
    setSettings(newSettings);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    
    const handleSyncChoice = (remoteData) => {
      return new Promise((resolve) => {
        const remoteStaffCount = remoteData.metadata?.staffCount || 0;
        const remoteDeletedCount = remoteData.metadata?.deletedStaffCount || 0;
        
        Alert.alert(
          'Sync Data Found',
          `Remote backup contains:\n• ${remoteStaffCount} staff members\n• ${remoteDeletedCount} deleted records\n\nChoose how to sync:`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve('cancel')
            },
            {
              text: 'Merge',
              onPress: () => resolve('merge')
            },
            {
              text: 'Restore',
              style: 'destructive',
              onPress: () => resolve('restore')
            }
          ]
        );
      });
    };
    
    try {
      const result = await manualSync(handleSyncChoice);
      
      if (result.success) {
        if (result.cancelled) {
          Alert.alert('Sync Cancelled', 'No changes were made.');
        } else if (result.uploaded) {
          Alert.alert('Sync Success', 'Local data uploaded to Google Drive!');
        } else {
          Alert.alert('Sync Success', 'Data synced successfully!');
        }
        
        const lastSyncTime = await getLastSyncTime();
        setLastSync(lastSyncTime);
      } else {
        Alert.alert('Sync Failed', result.error || 'Could not sync data. Please check your connection.');
      }
    } catch (error) {
      Alert.alert('Sync Error', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Your local data will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = await getCurrentUser();
              if (currentUser) {
                await deleteUser(currentUser.google_id);
              }
            } catch (e) {
              console.log('Delete user error:', e);
            }
            try {
              await GoogleSignin.signOut();
            } catch (e) {
              console.log('Google sign out error:', e);
            }
            await authLogout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
        }
      ]
    );
  };

  const syncFrequencyOptions = [
    { label: 'Real-time', value: SYNC_FREQUENCY.REALTIME, description: 'Sync on every change' },
    { label: 'Daily', value: SYNC_FREQUENCY.DAILY, description: 'Once per day' },
    { label: 'Weekly', value: SYNC_FREQUENCY.WEEKLY, description: 'Once per week' },
    { label: 'Monthly', value: SYNC_FREQUENCY.MONTHLY, description: 'Once per month' },
  ];

  const formatLastSync = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  if (!settings) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <View style={styles.userRow}>
                <View style={styles.userIconContainer}>
                  <Ionicons name="person" size={24} color="#2563EB" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{currentUser?.name || 'Unknown'}</Text>
                  <Text style={styles.userEmail}>{currentUser?.email || 'No email'}</Text>
                </View>
              </View>
              {currentUser?.google_id && (
                <Text style={styles.userId}>ID: {currentUser.google_id.substring(0, 12)}...</Text>
              )}
            </View>
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sync Status</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last Sync</Text>
                <Text style={styles.statusValue}>{formatLastSync(lastSync)}</Text>
              </View>
              <TouchableOpacity 
                style={styles.syncButton} 
                onPress={handleManualSync}
                disabled={isSyncing}
              >
                <Ionicons name="sync" size={20} color={isSyncing ? '#9CA3AF' : '#2563EB'} />
                <Text style={[styles.syncButtonText, isSyncing && styles.syncButtonTextDisabled]}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Frequency</Text>
          <View style={styles.card}>
            {syncFrequencyOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionRow,
                  index < syncFrequencyOptions.length - 1 && styles.optionRowBorder
                ]}
                onPress={() => handleSyncFrequencyChange(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Ionicons 
                  name={settings.syncFrequency === option.value ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={24} 
                  color={settings.syncFrequency === option.value ? '#2563EB' : '#D1D5DB'} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Options</Text>
          <View style={styles.card}>
            <View style={[styles.switchRow, styles.switchRowBorder]}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Auto Sync</Text>
                <Text style={styles.switchDescription}>Automatically sync when changes are made</Text>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={handleAutoSyncChange}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={settings.autoSync ? '#2563EB' : '#F9FAFB'}
              />
            </View>
            
            <View style={[styles.switchRow, styles.switchRowBorder]}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Wi-Fi Only</Text>
                <Text style={styles.switchDescription}>Only sync when connected to Wi-Fi</Text>
              </View>
              <Switch
                value={settings.syncOnWifiOnly}
                onValueChange={handleWifiOnlyChange}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={settings.syncOnWifiOnly ? '#2563EB' : '#F9FAFB'}
              />
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Notify on Sync</Text>
                <Text style={styles.switchDescription}>Show notification when sync completes</Text>
              </View>
              <Switch
                value={settings.notifyOnSync}
                onValueChange={handleNotifyChange}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={settings.notifyOnSync ? '#2563EB' : '#F9FAFB'}
              />
            </View>
          </View>
        </View>

        {isLoggedIn && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  syncButtonTextDisabled: {
    color: '#9CA3AF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  switchRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  switchDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  userId: {
    fontSize: 12,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});