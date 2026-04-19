import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';

const PlanScreen = ({ navigation }) => {
  const { plan, setPlanType, setPlanStatus, isPremium, isPlanActive, staffList } = useApp();

  const handlePlanChange = (type) => {
    Alert.alert(
      'Change Plan',
      `Switch to ${type} plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: async () => {
            await setPlanType(type);
          }
        },
      ]
    );
  };

  const handleStatusChange = (status) => {
    Alert.alert(
      'Change Status',
      `Set plan status to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            await setPlanStatus(status);
          }
        },
      ]
    );
  };

  const lockedCount = staffList.filter(s => s.isLocked).length;
  const activeCount = staffList.filter(s => s.isActive && !s.isLocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Plan Settings</Text>
        <Text style={styles.subtitle}>Simulate plan changes for testing</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Plan</Text>
          <View style={styles.planInfo}>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>Plan Type:</Text>
              <Text style={styles.planValue}>
                {isPremium() ? 'Premium' : 'Free'}
              </Text>
            </View>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>Status:</Text>
              <Text style={[
                styles.planValue,
                isPlanActive() ? styles.activeText : styles.expiredText
              ]}>
                {isPlanActive() ? 'Active' : 'Expired'}
              </Text>
            </View>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>Staff Limit:</Text>
              <Text style={styles.planValue}>
                {isPremium() ? 'Unlimited' : '5'}
              </Text>
            </View>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>Active Staff:</Text>
              <Text style={styles.planValue}>{activeCount}</Text>
            </View>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>Locked Staff:</Text>
              <Text style={[styles.planValue, styles.expiredText]}>{lockedCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Switch Plan Type</Text>
          <Text style={styles.cardDescription}>
            Change between Free and Premium plans
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.optionButton,
              !isPremium() && styles.selectedOption
            ]}
            onPress={() => handlePlanChange('Free')}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Free Plan</Text>
              <Text style={styles.optionDescription}>Max 5 staff members</Text>
            </View>
            {!isPremium() && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Active</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.optionButton,
              isPremium() && styles.selectedOption
            ]}
            onPress={() => handlePlanChange('Premium')}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Premium Plan</Text>
              <Text style={styles.optionDescription}>Unlimited staff members</Text>
            </View>
            {isPremium() && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Active</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Simulate Plan Status</Text>
          <Text style={styles.cardDescription}>
            Test plan expiry behavior
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.optionButton,
              isPlanActive() && styles.selectedOption
            ]}
            onPress={() => handleStatusChange('Active')}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Active</Text>
              <Text style={styles.optionDescription}>All features unlocked</Text>
            </View>
            {isPlanActive() && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Current</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.optionButton,
              !isPlanActive() && styles.selectedOption
            ]}
            onPress={() => handleStatusChange('Expired')}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Expired</Text>
              <Text style={styles.optionDescription}>Lock staff beyond limit</Text>
            </View>
            {!isPlanActive() && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Current</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Note:</Text>
          <Text style={styles.infoText}>
            This screen is for testing purposes only. In production, plan changes 
            would be handled via in-app purchases or admin dashboard.
          </Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  planInfo: {
    gap: 8,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planLabel: {
    fontSize: 14,
    color: '#666',
  },
  planValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeText: {
    color: '#10b981',
  },
  expiredText: {
    color: '#ef4444',
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  selectedBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#92400e',
  },
});

export default PlanScreen;