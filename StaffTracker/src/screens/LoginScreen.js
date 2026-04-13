import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { isAuthenticated, getStoredAuth } from '../auth/authService';
import { syncData, loadRemoteData, initSyncManager, addSyncListener, removeSyncListener } from '../services/syncManager';
import { initUserDB, saveUser } from '../database/userDb';

GoogleSignin.configure({
  webClientId: '619998385389-2t8oo9rgu0g6ejt8e409pp9b4bp6pa0o.apps.googleusercontent.com',
  offlineAccess: true,
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

  const handleAuthSuccess = async (userInfo) => {
    try {
      const googleUser = {
        id: userInfo.user.id,
        email: userInfo.user.email,
        name: userInfo.user.name,
        photo: userInfo.user.photo || userInfo.user.photoURL || null,
        accessToken: userInfo.idToken,
      };

      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync('stafftracker_auth', JSON.stringify(googleUser));
      } catch (e) {
        console.log('SecureStore error:', e.message);
      }

      try {
        await initUserDB();
        await saveUser({ ...googleUser, idToken: userInfo.idToken });
        console.log('User saved to SQLite');
      } catch (dbError) {
        console.log('SQLite save error (non-critical):', dbError.message);
      }

      const syncResult = await syncData();

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
        const result = await loadRemoteData();
        
        if (result.success) {
          await initSyncManager();
          navigation.replace('MainApp');
        } else {
          Alert.alert(
            'Sync Error',
            'Could not sync with Google Drive. Continue offline?',
            [
              { text: 'Continue Offline', onPress: () => navigation.replace('MainApp') }
            ]
          );
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
      console.log('User Info:', userInfo);
      await handleAuthSuccess(userInfo.data);
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