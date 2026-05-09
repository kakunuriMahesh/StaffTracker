import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPlanDetails } from '../services/planService';
import { resetToFreePlan } from '../utils/upgradeHelper';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    type: 'free',
    price: 0,
    duration: 'Forever',
    features: ['Up to 5 staff members', 'Basic attendance tracking', 'Monthly salary calculation'],
    popular: false,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    type: 'paid',
    price: 99,
    duration: '/month',
    features: ['Up to 50 staff members', 'All premium features', 'Priority support', 'No ads'],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    type: 'paid',
    price: 599,
    duration: '/year',
    features: ['Unlimited staff', 'All premium features', 'Priority support', 'Save ₹589/year'],
    popular: false,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    type: 'paid',
    price: 999,
    duration: 'one-time',
    features: ['Unlimited staff', 'All features forever', 'Lifetime support', 'Best value'],
    popular: false,
  },
];

export default function UpgradeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [currentPlan, setCurrentPlan] = useState('free');

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    const details = await getPlanDetails();
    setCurrentPlan(details.userPlan);
  };

  const handleUpgrade = (planId) => {
    if (planId === 'free') {
      Alert.alert('Current Plan', 'You are already on the Free plan.');
      return;
    }

    const selectedPlan = PLANS.find(p => p.id === planId);
    if (!selectedPlan) return;

    // TODO: Integrate Google Play Billing here using react-native-iap in future update
    if (selectedPlan.type !== 'free') {
      Alert.alert(
        'Coming Soon',
        'Premium plans will be available in the next update. Stay tuned!',
        [{ text: 'OK' }]
      );
      return;
    }
  };

  const handleResetToFree = () => {
    Alert.alert(
      'Reset to Free',
      'This will reset your plan to Free (5 staff limit). Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          await resetToFreePlan();
          loadCurrentPlan();
        }},
      ]
    );
  };

  const isCurrentPlan = (planId) => currentPlan === planId;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>🚀</Text>
          <Text style={styles.heroSubtitle}>Unlock More Staff</Text>
          <Text style={styles.heroDesc}>
            Upgrade your plan to add more staff members and access all premium features
          </Text>
        </View>

        {PLANS.map((plan) => (
          <View 
            key={plan.id} 
            style={[
              styles.planCard,
              plan.popular && styles.planCardPopular,
              isCurrentPlan(plan.id) && styles.planCardCurrent,
            ]}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Most Popular</Text>
              </View>
            )}
            {isCurrentPlan(plan.id) && (
              <View style={styles.currentBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.currentBadgeText}>Current Plan</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{plan.price}</Text>
                <Text style={styles.duration}>{plan.duration}</Text>
              </View>
            </View>

            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark" size={16} color={plan.popular ? '#2563EB' : '#10B981'} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.upgradeBtn,
                plan.popular && styles.upgradeBtnPopular,
                plan.id === 'free' && styles.upgradeBtnFree,
                isCurrentPlan(plan.id) && styles.upgradeBtnDisabled,
              ]}
              onPress={() => handleUpgrade(plan.id)}
              disabled={isCurrentPlan(plan.id)}
            >
              <Text style={styles.upgradeBtnText}>
                {isCurrentPlan(plan.id) ? 'Current Plan' : 'Upgrade Now'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.noteSection}>
          <Ionicons name="information-circle" size={20} color="#64748B" />
          <Text style={styles.noteText}>
            Premium plans are coming soon. Stay tuned for updates!
          </Text>
        </View>

        {currentPlan !== 'free' && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetToFree}
          >
            <Text style={styles.resetBtnText}>Reset to Free Plan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardPopular: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  planCardCurrent: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -60,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  duration: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 10,
  },
  upgradeBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeBtnPopular: {
    backgroundColor: '#2563EB',
  },
  upgradeBtnFree: {
    backgroundColor: '#64748B',
  },
  upgradeBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    marginLeft: 10,
    lineHeight: 20,
  },
  resetBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  resetBtnText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});