import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAllStaff, getAllAdvances } from '../database/db';
import { getUserData, logout, isAuthenticated } from '../auth/authService';
import { getCurrentUser } from '../database/userDb';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

const TERMS_URL = 'https://yourdomain.com/terms-and-conditions.html';
const PRIVACY_URL = 'https://yourdomain.com/privacy-policy.html';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalAdvances: 0,
  });
  const [userData, setUserData] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      const staffList = await getAllStaff();
      const advancesList = await getAllAdvances();
      
      let user = await getUserData();
      
      let dbUser = null;
      try {
        dbUser = await getCurrentUser();
      } catch (e) {
        console.log('[Profile] getCurrentUser error:', e.message);
      }
      
      setStats({
        totalStaff: staffList?.length || 0,
        activeStaff: staffList?.length || 0,
        totalAdvances: advancesList?.length || 0,
      });
      
      if (user || dbUser) {
        setUserData({
          name: user?.name || dbUser?.name || 'Unknown',
          email: user?.email || dbUser?.email || 'No email',
          photoURL: user?.photoURL || user?.photo || null,
          googleId: dbUser?.google_id || user?.google_id || null,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        totalStaff: 0,
        activeStaff: 0,
        totalAdvances: 0,
      });
    }
  };

  const openURL = async (url, title) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Cannot Open Link',
          `Unable to open ${title}. Please visit: ${url}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Unable to open the link. Please try again.');
    }
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate App',
      'If you enjoy using StaffTracker, please take a moment to rate us on the app store!',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Rate Now', onPress: () => openURL('https://play.google.com/store/apps/details?id=com.srcdesigns.StaffTracker', 'Play Store') },
      ]
    );
  };

  const handleShareApp = () => {
    Alert.alert(
      'Share StaffTracker',
      'Share this app with friends and family who might benefit from it!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => openURL('https://play.google.com/store/apps/details?id=com.srcdesigns.StaffTracker', 'Play Store') },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#fff" />
              </View>
            )}
            <View style={styles.appBadge}>
              <Text style={styles.appBadgeText}>v{APP_VERSION}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{userData?.name || 'Guest'}</Text>
          <Text style={styles.userEmail}>{userData?.email || 'Sign in to sync your data'}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalStaff}</Text>
            <Text style={styles.statLabel}>Total Staff</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.activeStaff}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalAdvances}</Text>
            <Text style={styles.statLabel}>Advances</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => openURL(TERMS_URL, 'Terms & Conditions')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="document-text" size={20} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Terms & Conditions</Text>
                <Text style={styles.menuSubtitle}>Read our terms of service</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => openURL(PRIVACY_URL, 'Privacy Policy')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Privacy Policy</Text>
                <Text style={styles.menuSubtitle}>How we protect your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleRateApp}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="star" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Rate App</Text>
                <Text style={styles.menuSubtitle}>Share your feedback</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleShareApp}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="share-social" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Share App</Text>
                <Text style={styles.menuSubtitle}>Tell your friends about us</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => openURL('mailto:support@stafftracker.app?subject=StaffTracker Support', 'Email Support')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="mail" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Contact Support</Text>
                <Text style={styles.menuSubtitle}>support@stafftracker.app</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>App Version</Text>
              <Text style={styles.aboutValue}>{APP_VERSION}</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Build Number</Text>
              <Text style={styles.aboutValue}>{BUILD_NUMBER}</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Platform</Text>
              <Text style={styles.aboutValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Framework</Text>
              <Text style={styles.aboutValue}>Expo SDK 54</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for Households</Text>
          <Text style={styles.copyright}>© 2025 StaffTracker. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  content: { paddingBottom: 40 },
  
  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#F1F5F9',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  appBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
    color: '#64748B',
  },
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#F1F5F9',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 5,
  },
  
  section: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
    marginTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  
  aboutCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  aboutLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
