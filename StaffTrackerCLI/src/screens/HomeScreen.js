import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';

const HomeScreen = ({ navigation }) => {
  const { user, staffList, plan, isPremium, isPlanActive } = useApp();

  const activeStaff = staffList.filter(s => s.isActive).length;
  const totalStaff = staffList.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome, {user?.name || 'User'}</Text>
          <Text style={styles.subtitle}>Staff Attendance Tracker</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalStaff}</Text>
            <Text style={styles.statLabel}>Total Staff</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeStaff}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planLabel}>Current Plan</Text>
            <View style={[
              styles.planBadge,
              isPremium() ? styles.premiumBadge : styles.freeBadge
            ]}>
              <Text style={styles.planBadgeText}>
                {isPremium() ? 'Premium' : 'Free'}
              </Text>
            </View>
          </View>
          <View style={styles.planStatus}>
            <Text style={styles.planStatusLabel}>Status:</Text>
            <Text style={[
              styles.planStatusValue,
              isPlanActive() ? styles.activeStatus : styles.expiredStatus
            ]}>
              {isPlanActive() ? 'Active' : 'Expired'}
            </Text>
          </View>
          <Text style={styles.planLimit}>
            {isPremium() ? 'Unlimited staff' : 'Max 5 staff'}
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.navigate('StaffList')}
          >
            <Text style={styles.menuButtonText}>Manage Staff</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.navigate('Attendance')}
          >
            <Text style={styles.menuButtonText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.navigate('Plan')}
          >
            <Text style={styles.menuButtonText}>Plan Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadge: {
    backgroundColor: '#e5e7eb',
  },
  premiumBadge: {
    backgroundColor: '#fef3c7',
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  planStatus: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  planStatusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  planStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeStatus: {
    color: '#10b981',
  },
  expiredStatus: {
    color: '#ef4444',
  },
  planLimit: {
    fontSize: 14,
    color: '#666',
  },
  buttonsContainer: {
    gap: 12,
  },
  menuButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;