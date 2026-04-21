import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getArchivedStaff, unarchiveStaff } from '../database/db';
import { syncData } from '../services/syncManager';

export default function ArchiveScreen({ navigation }) {
  const [archivedStaff, setArchivedStaff] = useState([]);
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    try {
      const list = await getArchivedStaff();
      setArchivedStaff(list || []);
    } catch (error) {
      console.log('[ArchiveScreen] loadData error:', error);
      setArchivedStaff([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleUnarchive = (staff) => {
    Alert.alert(
      'Restore Staff',
      `Restore ${staff.name} from archive? They will be added back to your staff list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          onPress: async () => {
            await unarchiveStaff(staff.id);
            await syncData();
            loadData();
          }
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('StaffDetail', { staffId: item.id })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.roleRow}>
          <Ionicons name="briefcase-outline" size={12} color="#6B7280" />
          <Text style={styles.role}>{item.position}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.salary}>₹{item.salary}</Text>
          <Text style={styles.salaryFreq}>/{item.salary_type === 'daily' ? 'day' : 'mo'}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.unarchiveBtn} 
        onPress={() => handleUnarchive(item)}
      >
        <Ionicons name="arrow-up-circle" size={22} color="#2563EB" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archived Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      {archivedStaff.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="archive-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No archived staff</Text>
          <Text style={styles.emptyDesc}>
            Staff members you archive will appear here. They won't count towards your plan limit.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {archivedStaff.length} archived staff member{archivedStaff.length !== 1 ? 's' : ''} - not counted towards plan limit
            </Text>
          </View>
          <FlatList
            data={archivedStaff}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#6B7280' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  roleRow: { flexDirection: 'row', alignItems: 'center' },
  role: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  separator: { fontSize: 13, color: '#9CA3AF', marginHorizontal: 6 },
  salary: { fontSize: 13, fontWeight: '600', color: '#059669' },
  salaryFreq: { fontSize: 11, color: '#6B7280' },
  unarchiveBtn: { padding: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginVertical: 8, borderRadius: 10 },
  infoText: { fontSize: 13, color: '#92400E', marginLeft: 8, flex: 1 },
});