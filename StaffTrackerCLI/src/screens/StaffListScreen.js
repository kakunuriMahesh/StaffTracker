import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';

const StaffListScreen = ({ navigation }) => {
  const { staffList, deleteStaff, isStaffLocked, canEditStaff, isPremium, getMaxStaffCount } = useApp();

  const handleDelete = (staff) => {
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete ${staff.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteStaff(staff.id),
        },
      ]
    );
  };

  const renderStaff = ({ item }) => (
    <View style={styles.staffCard}>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.name}</Text>
        <Text style={styles.staffjoined}>
          Joined: {new Date(item.joinedDate).toLocaleDateString()}
        </Text>
        {item.isLocked && (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </View>
      <View style={styles.staffActions}>
        {canEditStaff(item) && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('AddEditStaff', { staff: item })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const canAddStaff = isPremium() || staffList.length < getMaxStaffCount();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff List</Text>
        <Text style={styles.subtitle}>
          {staffList.length} / {isPremium() ? '∞' : getMaxStaffCount()} staff
        </Text>
      </View>

      {staffList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No staff members yet</Text>
          <Text style={styles.emptySubtext}>Tap + to add your first staff</Text>
        </View>
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={item => item.id}
          renderItem={renderStaff}
          contentContainerStyle={styles.list}
        />
      )}

      {canAddStaff ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddEditStaff', {})}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.limitWarning}>
          <Text style={styles.limitWarningText}>
            Free plan allows only {getMaxStaffCount()} staff. Upgrade to Premium for unlimited.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  staffCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  staffjoined: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  lockedBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  lockedText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  staffActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  limitWarning: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    left: 16,
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
  },
  limitWarningText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default StaffListScreen;