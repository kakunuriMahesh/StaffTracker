import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { isAuthenticated, getStoredAuth } from '../auth/authService';
import { syncData, loadRemoteData, initSyncManager, addSyncListener, removeSyncListener } from '../services/syncManager';
import { initUserDB, saveUser, getUserByGoogleId } from '../database/userDb';

GoogleSignin.configure({
  webClientId: '619998385389-2t8oo9rgu0g6ejt8e409pp9b4bp6pa0o.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

export default function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  useEffect(() => {
    const handleSyncStatus = (event) => {
      if (event.type === 'sync_complete') {
        navigation.replace('MainApp');
      } else if (event.type === 'sync_error') {
        navigation.replace('MainApp');
      }
    };

    addSyncListener(handleSyncStatus);
    return () => removeSyncListener(handleSyncStatus);
  }, [navigation]);

  const handleAuthSuccess = async (userInfo, tokens) => {
    try {
      const google_id = userInfo?.id;
      const accessToken = tokens?.accessToken;
      
      if (!google_id) {
        console.log('[Login] ERROR: google_id is missing');
        Alert.alert('Login Error', 'Could not get Google user ID. Please try again.');
        setIsLoading(false);
        return;
      }
      
      if (!accessToken) {
        Alert.alert('Drive Permission Required', 'Please grant Drive access to sync your data.');
        setIsLoading(false);
        return;
      }
      
      console.log('[Login] google_id:', google_id);
      console.log('[Login] accessToken present:', !!accessToken);
      console.log('[Login] Drive scope granted');
      
      const googleUser = {
        google_id: google_id,
        email: userInfo?.email || null,
        name: userInfo?.name || null,
        photo: userInfo?.photo || userInfo?.photoURL || null,
        accessToken: accessToken,
        idToken: tokens?.idToken || null,
      };
      
      console.log('[Login] Normalized user:', JSON.stringify({ google_id, email: googleUser.email, name: googleUser.name }));

      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync('stafftracker_auth', JSON.stringify(googleUser));
      } catch (e) {
        console.log('SecureStore error:', e.message);
      }

      try {
        await initUserDB();
        const existingUser = await getUserByGoogleId(google_id);
        if (existingUser) {
          console.log('[Login] User already exists, skipping insert');
        } else {
          await saveUser(googleUser);
          console.log('[Login] New user created');
        }
      } catch (dbError) {
        console.log('SQLite save error (non-critical):', dbError.message);
      }

      const syncPromise = syncData();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({ success: true, timeout: true }), 10000)
      );
      
      let syncResult;
      try {
        syncResult = await Promise.race([syncPromise, timeoutPromise]);
        if (syncResult?.timeout) {
          console.log('[Login] Sync timeout, continuing anyway...');
        }
      } catch (syncError) {
        console.log('[Login] Sync error (non-critical):', syncError.message);
        syncResult = { success: true };
      }

      if (syncResult.success) {
        await initSyncManager();
        navigation.replace('MainApp');
      } else {
        Alert.alert('Sync Warning', 'Data saved locally. Will sync when online.', [
          { text: 'Continue', onPress: () => navigation.replace('MainApp') }
        ]);
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
      setIsLoading(false);
      setIsLoadingAuth(false);
    }
  };

  const checkExistingAuth = async () => {
    try {
      const authenticated = await isAuthenticated();
      
      if (authenticated) {
        setIsLoadingAuth(true);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sync timeout')), 10000)
        );
        
        try {
          const result = await Promise.race([loadRemoteData(), timeoutPromise]);
          
          if (result.success) {
            await initSyncManager();
            navigation.replace('MainApp');
          } else {
            navigation.replace('MainApp');
          }
        } catch (syncError) {
          console.log('Sync timeout/fallback:', syncError.message);
          navigation.replace('MainApp');
        }
      } else {
        setIsLoadingAuth(false);
      }
    } catch (error) {
      setIsLoadingAuth(false);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('[Login] User signed in');
      
      const tokens = await GoogleSignin.getTokens();
      console.log('[Login] Tokens received');
      
      const rawUserInfo = userInfo?.data?.user || userInfo?.user || userInfo;
      const googleId = rawUserInfo?.id;
      if (!googleId) {
        console.log('[Login] ERROR: No Google ID found');
        Alert.alert('Login Error', 'Could not get Google user ID. Please try again.');
        setIsLoading(false);
        return;
      }
      console.log('[Login] Google ID:', googleId);
      await handleAuthSuccess(rawUserInfo, tokens);
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      if (error.code === 'SIGN_IN_CANCELLED') {
        setIsLoading(false);
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services not available. Please install or update Google Play Services.');
        setIsLoading(false);
      } else {
        Alert.alert('Login Failed', 'Authentication failed. Please try again.');
        setIsLoading(false);
      }
    }
  }, [navigation]);

  const handleSkipLogin = async () => {
    navigation.replace('MainApp');
  };

  if (isLoadingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="people" size={80} color="#2563EB" />
          <Text style={styles.title}>Staff Tracker</Text>
          <Text style={styles.subtitle}>Manage your staff with ease</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.googleButton]} 
            onPress={signInWithGoogle}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.skipButton]} 
            onPress={handleSkipLogin}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Continue without login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sign in to sync with Google Drive
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#2563EB',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});