import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const PlansScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { plan, setPlanType, setPlanStatus, isPremium, isPlanActive, staffList } = useApp();

  useFocusEffect(
    useCallback(() => {
      // Refresh on focus
    }, [])
  );

  const handleUpgrade = (planType) => {
    Alert.alert(
      'Upgrade Plan',
      `You are about to upgrade to ${planType} plan. In a production app, this would lead to payment gateway.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            if (planType === 'Premium') {
              await setPlanType('Premium');
              await setPlanStatus('Active');
              Alert.alert('Success', 'You are now on Premium plan!');
            } else if (planType === 'Lifetime') {
              await setPlanType('Lifetime');
              await setPlanStatus('Active');
              Alert.alert('Success', 'You now have Lifetime access!');
            }
          },
        },
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert('Restore Purchases', 'This would restore any previous purchases in production.');
  };

  const currentPlan = plan?.type || 'Free';
  const isActive = isPlanActive();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plans & Pricing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <Icon name="card" size={24} color="#2563EB" />
            <Text style={styles.currentPlanTitle}>Current Plan</Text>
          </View>
          <View style={styles.currentPlanDetails}>
            <Text style={styles.planType}>{currentPlan}</Text>
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          {plan?.expiryDate ? (
            <Text style={styles.expiryText}>
              Expires: {new Date(plan.expiryDate).toLocaleDateString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.plansContainer}>
          <Text style={styles.sectionTitle}>Available Plans</Text>

          <View style={[styles.planCard, currentPlan === 'Free' && styles.planCardCurrent]}>
            <View style={styles.planHeader}>
              <View style={styles.planIconContainer}>
                <Icon name="person" size={24} color="#2563EB" />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Free Plan</Text>
                <Text style={styles.planPrice}>₹0</Text>
              </View>
            </View>
            <View style={styles.planFeatures}>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Up to 5 staff members</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Basic attendance tracking</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Local storage only</Text>
              </View>
            </View>
            <View style={styles.planButtonContainer}>
              {currentPlan === 'Free' ? (
                <TouchableOpacity style={styles.currentPlanBtn} disabled>
                  <Text style={styles.currentPlanBtnText}>Current Plan</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.switchPlanBtn} onPress={() => handleUpgrade('Free')}>
                  <Text style={styles.switchPlanBtnText}>Downgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.planCard, styles.planCardPremium, currentPlan === 'Premium' && styles.planCardCurrent]}>
            <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>BEST VALUE</Text></View>
            <View style={styles.planHeader}>
              <View style={[styles.planIconContainer, styles.planIconPremium]}>
                <Icon name="star" size={24} color="#fff" />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Premium Plan</Text>
                <Text style={styles.planPrice}>₹199<Text style={styles.planPricePeriod}>/month</Text></Text>
              </View>
            </View>
            <View style={styles.planFeatures}>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Unlimited staff members</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Advanced analytics</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Cloud backup</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Export reports</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Priority support</Text>
              </View>
            </View>
            <View style={styles.planButtonContainer}>
              {currentPlan === 'Premium' ? (
                <TouchableOpacity style={styles.currentPlanBtn} disabled>
                  <Text style={styles.currentPlanBtnText}>Current Plan</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.upgradeBtn} onPress={() => handleUpgrade('Premium')}>
                  <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.planCard, currentPlan === 'Lifetime' && styles.planCardCurrent]}>
            <View style={styles.planHeader}>
              <View style={styles.planIconContainer}>
                <Icon name="infinite" size={24} color="#7C3AED" />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Lifetime Plan</Text>
                <Text style={styles.planPrice}>₹999<Text style={styles.planPricePeriod}>/once</Text></Text>
              </View>
            </View>
            <View style={styles.planFeatures}>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>All Premium features</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Never pay again</Text>
              </View>
              <View style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureText}>Lifetime updates</Text>
              </View>
            </View>
            <View style={styles.planButtonContainer}>
              {currentPlan === 'Lifetime' ? (
                <TouchableOpacity style={styles.currentPlanBtn} disabled>
                  <Text style={styles.currentPlanBtnText}>Current Plan</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.upgradeBtn} onPress={() => handleUpgrade('Lifetime')}>
                  <Text style={styles.upgradeBtnText}>Get Lifetime</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Prices include GST. Subscription renews automatically.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://example.com/terms')}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://example.com/privacy')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  content: { padding: 16, paddingBottom: 40 },
  currentPlanCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPlanTitle: { fontSize: 14, color: '#64748B', marginLeft: 8 },
  currentPlanDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planType: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: { backgroundColor: '#D1FAE5' },
  statusInactive: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextActive: { color: '#065F46' },
  statusTextInactive: { color: '#991B1B' },
  expiryText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16 },
  plansContainer: { gap: 16 },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planCardCurrent: { borderColor: '#2563EB', borderWidth: 2 },
  planCardPremium: { borderColor: '#2563EB' },
  premiumBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planIconPremium: { backgroundColor: '#2563EB' },
  planInfo: { flex: 1 },
  planName: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  planPrice: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  planPricePeriod: { fontSize: 14, fontWeight: '400', color: '#64748B' },
  planFeatures: { marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 14, color: '#374151', marginLeft: 8 },
  planButtonContainer: { marginTop: 8 },
  upgradeBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchPlanBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchPlanBtnText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  currentPlanBtn: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanBtnText: { color: '#065F46', fontSize: 16, fontWeight: '600' },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreButtonText: { color: '#64748B', fontSize: 14 },
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 8 },
  linkText: { fontSize: 12, color: '#2563EB', marginTop: 4 },
});

export default PlansScreen;