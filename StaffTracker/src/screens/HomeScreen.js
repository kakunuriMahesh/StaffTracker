import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getAllStaff, getAttendanceByDate } from '../database/db';
import { syncData, addSyncListener, removeSyncListener } from '../services/syncManager';
import { applyStaffLocking } from '../utils/staffAccessControl';
import { addPlanChangeListener } from '../services/planService';
import { addStaffReloadListener } from '../services/staffReload';

const TODAY = dayjs().format('YYYY-MM-DD');
const STATUS_COLOR = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const STATUS_TEXT  = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const STATUS_ICON  = { P: 'checkmark-circle', A: 'close-circle', L: 'time-outline' };

export default function HomeScreen({ navigation }) {
  const [staff, setStaff]           = useState([]);
  const [todayMap, setTodayMap]     = useState({});
  const [lastSync, setLastSync] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handleSyncEvent = (event) => {
      if (event.type === 'sync_complete') {
        loadData();
        setLastSync(event.timestamp);
      } else if (event.type === 'sync_error') {
        Alert.alert('Sync Error', event.error);
      }
    };
    addSyncListener(handleSyncEvent);
    
    const handlePlanChange = () => {
      console.log('[HomeScreen] Plan changed, reloading data');
      loadData();
    };
    const removePlanListener = addPlanChangeListener(handlePlanChange);
    
    const removeReloadListener = addStaffReloadListener(() => {
      loadData();
    });
    
    return () => {
      removeSyncListener(handleSyncEvent);
      removePlanListener();
      removeReloadListener();
    };
  }, []);

  const loadData = async () => {
    try {
      const list = await getAllStaff();
      if (!list || !Array.isArray(list)) {
        setStaff([]);
        return;
      }
      const lockedList = await applyStaffLocking(list);
      const records = await getAttendanceByDate(TODAY);
      const map = {};
      records.forEach(r => { map[r.staff_id] = r.status; });
      setStaff(lockedList || []);
      setTodayMap(map);
    } catch (error) {
      console.log('[HomeScreen] loadData error:', error);
      setStaff([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Maid': return 'home-outline';
      case 'Cook': return 'restaurant-outline';
      case 'Driver': return 'car-outline';
      case 'Gardener': return 'leaf-outline';
      case 'Security': return 'shield-checkmark-outline';
      case 'Watchman': return 'eye-outline';
      default: return 'person-outline';
    }
  };

  const renderItem = ({ item }) => {
    const status = todayMap[item.id];
    const isLocked = item.isLocked;
    return (
      <TouchableOpacity 
        style={[styles.card, isLocked && styles.cardLocked]} 
        onPress={() => navigation.navigate('StaffDetail', { staffId: item.id, isLocked })}
      >
        <View style={[styles.avatar, isLocked && styles.avatarLocked]}>
          <Text style={[styles.avatarText, isLocked && styles.avatarTextLocked]}>{item.name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isLocked && styles.nameLocked]}>{item.name}</Text>
            {isLocked && (
              <Ionicons name="lock-closed" size={14} color="#9CA3AF" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={styles.roleRow}>
            <Ionicons name={getRoleIcon(item.position)} size={12} color="#6B7280" />
            <Text style={styles.role}>{item.position}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.salary}>₹{item.salary}</Text>
            <Text style={styles.salaryFreq}>/{item.salary_type === 'daily' ? 'day' : 'mo'}</Text>
          </View>
        </View>
        <View style={[styles.badge, status ? { backgroundColor: STATUS_COLOR[status] } : styles.badgeEmpty]}>
          <Ionicons 
            name={status ? STATUS_ICON[status] : 'ellipse-outline'} 
            size={18} 
            color={status ? STATUS_TEXT[status] : '#9CA3AF'} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Staff</Text>
          <View style={styles.subtitleRow}>
            <Ionicons name="calendar-outline" size={12} color="#6B7280" />
            <Text style={styles.subtitle}>{dayjs().format('dddd, DD MMM YYYY')}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.archiveBtn} 
            onPress={() => navigation.navigate('Archive')}
          >
            <Ionicons name="archive-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.syncBtn} 
            onPress={() => navigation.navigate('SyncSettings')}
          >
            <Ionicons name="cloud-done-outline" size={20} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddStaff')}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
      {staff.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No staff added yet</Text>
          <Text style={styles.emptyDesc}>Tap "Add" to add your first staff member.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddStaff')}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Add Staff</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F3F4F6' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title:       { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  subtitle:    { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  addBtnText:  { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 4 },
  syncBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  archiveBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardLocked:  { opacity: 0.7, borderColor: '#D1D5DB' },
  avatar:      { width: 50, height: 50, borderRadius: 25, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarLocked: { backgroundColor: '#E5E7EB' },
  avatarText:  { fontSize: 20, fontWeight: '700', color: '#1D4ED8' },
  avatarTextLocked: { color: '#9CA3AF' },
  info:        { flex: 1 },
  name:        { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  nameLocked:  { color: '#6B7280' },
  nameRow:     { flexDirection: 'row', alignItems: 'center' },
  roleRow:     { flexDirection: 'row', alignItems: 'center' },
  role:        { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  separator:   { fontSize: 13, color: '#9CA3AF', marginHorizontal: 6 },
  salary:      { fontSize: 13, fontWeight: '600', color: '#059669' },
  salaryFreq:  { fontSize: 11, color: '#6B7280' },
  badge:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badgeEmpty:  { backgroundColor: '#F3F4F6' },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:  { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyDesc:   { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
});