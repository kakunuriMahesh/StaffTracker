import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const ArchiveScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { getArchivedStaffList, unarchiveStaff, staffList, reloadData } = useApp();

  const archivedStaff = getArchivedStaffList();

  const handleUnarchive = (staff) => {
    Alert.alert(
      'Restore Staff',
      `Restore ${staff.name} from archive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          onPress: async () => {
            await unarchiveStaff(staff.id);
            reloadData();
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
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.role}>{item.position}</Text>
      </View>
      <TouchableOpacity 
        style={styles.unarchiveBtn} 
        onPress={() => handleUnarchive(item)}
      >
        <Icon name="arrow-up-circle" size={22} color="#2563EB" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archived Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      {archivedStaff.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Icon name="archive-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No archived staff</Text>
          <Text style={styles.emptyDesc}>
            Staff members you archive will appear here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBanner}>
            <Icon name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {archivedStaff.length} archived - not counted towards plan limit
            </Text>
          </View>
          <FlatList
            data={archivedStaff}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#6B7280' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  role: { fontSize: 13, color: '#6B7280' },
  unarchiveBtn: { padding: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginVertical: 8, borderRadius: 10 },
  infoText: { fontSize: 13, color: '#92400E', marginLeft: 8, flex: 1 },
});

export default ArchiveScreen;