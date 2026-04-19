import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const STATUS_BG = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const STATUS_FG = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const STATUS_ICON = {
  P: 'checkmark-circle',
  A: 'close-circle',
  L: 'time-outline',
};

const StaffDetailScreen = ({ route, navigation }) => {
  const { staffId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { staffList, deleteStaff, isStaffLocked, canEditStaff, getAttendance, markAttendance } = useApp();

  const staff = staffList.find((s) => s.id === staffId);
  const isLocked = staff ? isStaffLocked(staff) : false;
  const canEdit = staff ? canEditStaff(staff) : false;

  useFocusEffect(
    useCallback(() => {
      // Refresh on focus
    }, [])
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete ${staff?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteStaff(staffId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Maid':
        return 'home-outline';
      case 'Cook':
        return 'restaurant-outline';
      case 'Driver':
        return 'car-outline';
      case 'Gardener':
        return 'leaf-outline';
      case 'Security':
        return 'shield-checkmark-outline';
      case 'Watchman':
        return 'eye-outline';
      default:
        return 'person-outline';
    }
  };

  if (!staff) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Icon name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Staff not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Details</Text>
        {canEdit && (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditStaff', { staffId: staff.id })}
            style={styles.editBtn}
          >
            <Icon name="create-outline" size={22} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, isLocked && styles.avatarLocked]}>
              <Text style={[styles.avatarText, isLocked && styles.avatarTextLocked]}>
                {staff.name ? staff.name[0].toUpperCase() : '?'}
              </Text>
            </View>
            {isLocked && (
              <View style={styles.lockedBadge}>
                <Icon name="lock-closed" size={12} color="#fff" />
                <Text style={styles.lockedBadgeText}>Locked</Text>
              </View>
            )}
          </View>
          <Text style={styles.staffName}>{staff.name}</Text>
          <View style={styles.roleRow}>
            <Icon
              name={getRoleIcon(staff.position)}
              size={16}
              color="#6B7280"
            />
            <Text style={styles.roleText}>{staff.position || 'Staff'}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="call" size={20} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{staff.phone || '-'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="calendar" size={20} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>
                {formatDate(staff.joinedDate)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="wallet" size={20} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Salary</Text>
              <Text style={styles.infoValue}>
                ₹{staff.salary || 0} /{' '}
                {staff.salary_type === 'daily' ? 'day' : 'month'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View
                style={[styles.statBox, { backgroundColor: STATUS_BG.P }]}
              >
                <Icon
                  name={STATUS_ICON.P}
                  size={20}
                  color={STATUS_FG.P}
                />
              </View>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <View
                style={[styles.statBox, { backgroundColor: STATUS_BG.A }]}
              >
                <Icon
                  name={STATUS_ICON.A}
                  size={20}
                  color={STATUS_FG.A}
                />
              </View>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
              <View
                style={[styles.statBox, { backgroundColor: STATUS_BG.L }]}
              >
                <Icon
                  name={STATUS_ICON.L}
                  size={20}
                  color={STATUS_FG.L}
                />
              </View>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Leave</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, !canEdit && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!canEdit}
        >
          <Icon name="trash" size={20} color="#DC2626" />
          <Text style={styles.deleteBtnText}>Delete Staff</Text>
        </TouchableOpacity>
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
  editBtn: { padding: 8 },
  content: { padding: 16, paddingBottom: 40 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 16, color: '#6B7280' },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLocked: { backgroundColor: '#E5E7EB' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#1D4ED8' },
  avatarTextLocked: { color: '#9CA3AF' },
  lockedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600', marginLeft: 4 },
  staffName: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: { fontSize: 14, color: '#6B7280', marginLeft: 6 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statsTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: '#DC2626', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});

export default StaffDetailScreen;