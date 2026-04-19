import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const TODAY = new Date().toISOString().split('T')[0];
const STATUS_COLOR = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const STATUS_TEXT = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const STATUS_ICON = {
  P: 'checkmark-circle',
  A: 'close-circle',
  L: 'time-outline',
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    staffList,
    attendance,
    isStaffLocked,
    isPlanActive,
    isPremium,
    markAttendance,
    getAttendance,
    canMarkAttendance,
  } = useApp();

  const [todayMap, setTodayMap] = useState({});

  useEffect(() => {
    const map = {};
    staffList.forEach((s) => {
      const att = getAttendance(s.id, TODAY);
      if (att) map[s.id] = att;
    });
    setTodayMap(map);
  }, [staffList, attendance]);

  useFocusEffect(
    useCallback(() => {
      const map = {};
      staffList.forEach((s) => {
        const att = getAttendance(s.id, TODAY);
        if (att) map[s.id] = att;
      });
      setTodayMap(map);
    }, [])
  );

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

  const renderItem = ({ item }) => {
    const status = todayMap[item.id];
    const isLocked = isStaffLocked(item);

    return (
      <TouchableOpacity
        style={[styles.card, isLocked && styles.cardLocked]}
        onPress={() => navigation.navigate('StaffDetail', { staffId: item.id })}
      >
        <View style={[styles.avatar, isLocked && styles.avatarLocked]}>
          <Text style={[styles.avatarText, isLocked && styles.avatarTextLocked]}>
            {item.name ? item.name[0].toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isLocked && styles.nameLocked]}>
              {item.name}
            </Text>
            {isLocked && (
              <Icon
                name="lock-closed"
                size={14}
                color="#9CA3AF"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          <View style={styles.roleRow}>
            <Icon
              name={getRoleIcon(item.position)}
              size={12}
              color="#6B7280"
            />
            <Text style={styles.role}>{item.position || 'Staff'}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.salary}>
              ₹{item.salary || 0}
            </Text>
            <Text style={styles.salaryFreq}>
              /{item.salary_type === 'daily' ? 'day' : 'mo'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.badge,
            status ? { backgroundColor: STATUS_COLOR[status] } : styles.badgeEmpty,
          ]}
        >
          <Icon
            name={status ? STATUS_ICON[status] : 'ellipse-outline'}
            size={18}
            color={status ? STATUS_TEXT[status] : '#9CA3AF'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const formatDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Staff</Text>
          <View style={styles.subtitleRow}>
            <Icon name="calendar-outline" size={12} color="#6B7280" />
            <Text style={styles.subtitle}>{formatDate()}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddStaff')}>
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
      {staffList.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Icon name="people-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No staff added yet</Text>
          <Text style={styles.emptyDesc}>Tap "Add" to add your first staff member.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddStaff')}>
            <Icon name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Add Staff</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLocked: { opacity: 0.7, borderColor: '#D1D5DB' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLocked: { backgroundColor: '#E5E7EB' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#1D4ED8' },
  avatarTextLocked: { color: '#9CA3AF' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  nameLocked: { color: '#6B7280' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  roleRow: { flexDirection: 'row', alignItems: 'center' },
  role: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  separator: { fontSize: 13, color: '#9CA3AF', marginHorizontal: 6 },
  salary: { fontSize: 13, fontWeight: '600', color: '#059669' },
  salaryFreq: { fontSize: 11, color: '#6B7280' },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmpty: { backgroundColor: '#F3F4F6' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
});

export default HomeScreen;