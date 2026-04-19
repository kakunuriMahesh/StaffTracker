import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useApp } from '../context/AppContext';

const AttendanceScreen = ({ navigation }) => {
  const { staffList, markAttendance, getAttendance, canMarkAttendance } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#10b981';
      case 'Absent': return '#ef4444';
      case 'Leave': return '#f59e0b';
      default: return '#e5e7eb';
    }
  };

  const handleMark = async (staffId, status) => {
    await markAttendance(staffId, selectedDate, status);
  };

  const activeStaff = staffList.filter(s => s.isActive);

  const renderStaff = ({ item }) => {
    const status = getAttendance(item.id, selectedDate);
    const canMark = canMarkAttendance(item);

    return (
      <View style={styles.staffCard}>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{item.name}</Text>
          <Text style={styles.staffPosition}>{item.position || 'Staff'}</Text>
        </View>

        <View style={styles.statusButtons}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              status === 'Present' && styles.selectedPresent,
              !canMark && styles.disabledButton
            ]}
            onPress={() => canMark && handleMark(item.id, 'Present')}
            disabled={!canMark}
          >
            <Text style={[
              styles.statusButtonText,
              status === 'Present' && styles.selectedText
            ]}>P</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusButton,
              status === 'Absent' && styles.selectedAbsent,
              !canMark && styles.disabledButton
            ]}
            onPress={() => canMark && handleMark(item.id, 'Absent')}
            disabled={!canMark}
          >
            <Text style={[
              styles.statusButtonText,
              status === 'Absent' && styles.selectedText
            ]}>A</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusButton,
              status === 'Leave' && styles.selectedLeave,
              !canMark && styles.disabledButton
            ]}
            onPress={() => canMark && handleMark(item.id, 'Leave')}
            disabled={!canMark}
          >
            <Text style={[
              styles.statusButtonText,
              status === 'Leave' && styles.selectedText
            ]}>L</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>
          {new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      <View style={styles.dateSelector}>
        <FlatList
          horizontal
          data={dates}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dateItem,
                item === selectedDate && styles.selectedDate
              ]}
              onPress={() => setSelectedDate(item)}
            >
              <Text style={[
                styles.dateText,
                item === selectedDate && styles.selectedDateText
              ]}>
                {new Date(item).toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[
                styles.dateNum,
                item === selectedDate && styles.selectedDateText
              ]}>
                {new Date(item).getDate()}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {activeStaff.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active staff</Text>
          <Text style={styles.emptySubtext}>Add staff to mark attendance</Text>
        </View>
      ) : (
        <FlatList
          data={activeStaff}
          keyExtractor={item => item.id}
          renderItem={renderStaff}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Present (P)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Absent (A)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Leave (L)</Text>
        </View>
      </View>
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
  dateSelector: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  dateItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  selectedDate: {
    backgroundColor: '#2563eb',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  dateNum: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedDateText: {
    color: '#fff',
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
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  staffPosition: {
    fontSize: 14,
    color: '#666',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  selectedPresent: {
    backgroundColor: '#10b981',
  },
  selectedAbsent: {
    backgroundColor: '#ef4444',
  },
  selectedLeave: {
    backgroundColor: '#f59e0b',
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  selectedText: {
    color: '#fff',
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default AttendanceScreen;