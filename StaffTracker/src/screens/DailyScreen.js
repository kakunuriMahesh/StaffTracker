import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getAllStaff, getAttendanceByDate, markAttendance } from '../database/db';

const TODAY = dayjs().format('YYYY-MM-DD');
const S_BG  = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const S_FG  = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const S_ICON = { P: 'checkmark-circle', A: 'close-circle', L: 'time-outline' };

export default function DailyScreen() {
  const [staff,      setStaff]      = useState([]);
  const [attendance, setAttendance] = useState({});
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    const list = await getAllStaff();
    const records = await getAttendanceByDate(TODAY);
    const map = {};
    records.forEach(r => { map[r.staff_id] = r.status; });
    setStaff(list);
    setAttendance(map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mark = async (staffId, status) => {
    await markAttendance(staffId, TODAY, status);
    setAttendance(prev => ({ ...prev, [staffId]: status }));
  };

  const present  = Object.values(attendance).filter(s => s === 'P').length;
  const absent   = Object.values(attendance).filter(s => s === 'A').length;
  const leave    = Object.values(attendance).filter(s => s === 'L').length;
  const unmarked = staff.length - Object.keys(attendance).length;

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
    const cur = attendance[item.id];
    return (
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.roleRow}>
            <Ionicons name={getRoleIcon(item.position)} size={12} color="#6B7280" />
            <Text style={styles.role}>{item.position}</Text>
          </View>
        </View>
        <View style={styles.btnGroup}>
          {[
            { key: 'P', icon: 'checkmark-circle', label: 'Present' },
            { key: 'A', icon: 'close-circle', label: 'Absent' },
            { key: 'L', icon: 'time-outline', label: 'Leave' },
          ].map(({ key, icon, label }) => (
            <TouchableOpacity key={key} onPress={() => mark(item.id, key)}
              style={[styles.btn, cur === key && { backgroundColor: S_BG[key], borderColor: S_BG[key] }]}
              activeOpacity={0.7}>
              <Ionicons 
                name={icon} 
                size={20} 
                color={cur === key ? S_FG[key] : '#D1D5DB'} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Attendance</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.date}>{dayjs().format('dddd, DD MMM YYYY')}</Text>
          </View>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatNum}>{staff.length}</Text>
          <Text style={styles.headerStatLabel}>Staff</Text>
        </View>
      </View>
      
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#065F46" />
          </View>
          <Text style={[styles.summaryNum,{color:'#065F46'}]}>{present}</Text>
          <Text style={styles.summaryLbl}>Present</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={16} color="#991B1B" />
          </View>
          <Text style={[styles.summaryNum,{color:'#991B1B'}]}>{absent}</Text>
          <Text style={styles.summaryLbl}>Absent</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={16} color="#92400E" />
          </View>
          <Text style={[styles.summaryNum,{color:'#92400E'}]}>{leave}</Text>
          <Text style={styles.summaryLbl}>Leave</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="remove-circle-outline" size={16} color="#6B7280" />
          </View>
          <Text style={[styles.summaryNum,{color:'#6B7280'}]}>{unmarked}</Text>
          <Text style={styles.summaryLbl}>Pending</Text>
        </View>
      </View>

      {staff.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No staff added</Text>
          <Text style={styles.emptyText}>Add staff first from the Staff tab.</Text>
        </View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F3F4F6' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title:        { fontSize: 20, fontWeight: '700', color: '#111827' },
  dateRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  date:         { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  headerStats:   { alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  headerStatNum: { fontSize: 18, fontWeight: '700', color: '#2563EB' },
  headerStatLabel: { fontSize: 10, color: '#2563EB', fontWeight: '500' },
  summaryBar:   { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryIcon:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryNum:   { fontSize: 20, fontWeight: '700' },
  summaryLbl:   { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#E5E7EB' },
  row:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginBottom: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
  avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:   { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  nameCol:      { flex: 1 },
  name:         { fontSize: 15, fontWeight: '600', color: '#111827' },
  roleRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  role:         { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  btnGroup:     { flexDirection: 'row', gap: 8 },
  btn:          { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:   { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText:    { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});