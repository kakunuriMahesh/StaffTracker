import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const S_BG = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const S_FG = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const S_ICON = {
  P: 'checkmark-circle',
  A: 'close-circle',
  L: 'time-outline',
};

const DailyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    staffList,
    isStaffLocked,
    markAttendance,
    getAttendance,
    getNote,
    canMarkAttendance,
  } = useApp();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedStaffForNote, setSelectedStaffForNote] = useState(null);

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    const now = new Date();
    if (next <= now) {
      setCurrentMonth(next);
    }
  };

  const present = staffList.filter(
    (s) => getAttendance(s.id, selectedDate) === 'P'
  ).length;
  const absent = staffList.filter(
    (s) => getAttendance(s.id, selectedDate) === 'A'
  ).length;
  const leave = staffList.filter(
    (s) => getAttendance(s.id, selectedDate) === 'L'
  ).length;
  const unmarked = staffList.length - present - absent - leave;

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

  const handleMarkAttendance = (item) => {
    setSelectedStaffForNote(item);
    setNoteText(getNote(item.id, selectedDate) || '');
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (selectedStaffForNote) {
      const currentStatus = getAttendance(selectedStaffForNote.id, selectedDate) || 'P';
      await markAttendance(selectedStaffForNote.id, selectedDate, currentStatus, noteText);
    }
    setShowNoteModal(false);
    setNoteText('');
    setSelectedStaffForNote(null);
  };

  const renderItem = ({ item }) => {
    const cur = getAttendance(item.id, selectedDate);
    const hasNote = getNote(item.id, selectedDate);
    const isLocked = isStaffLocked(item);
    const canMark = canMarkAttendance(item);

    return (
      <View style={[styles.row, isLocked && styles.rowLocked]}>
        <View style={[styles.avatar, isLocked && styles.avatarLocked]}>
          <Text style={[styles.avatarText, isLocked && styles.avatarTextLocked]}>
            {item.name ? item.name[0].toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.nameCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isLocked && styles.nameLocked]}>
              {item.name}
            </Text>
            {isLocked && (
              <Icon name="lock-closed" size={12} color="#9CA3AF" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={styles.roleRow}>
            <Icon name={getRoleIcon(item.position)} size={12} color="#6B7280" />
            <Text style={styles.role}>{item.position || 'Staff'}</Text>
          </View>
        </View>
        <View style={styles.btnGroup}>
          {[
            { key: 'P', icon: 'checkmark-circle', label: 'Present' },
            { key: 'A', icon: 'close-circle', label: 'Absent' },
            { key: 'L', icon: 'time-outline', label: 'Leave' },
          ].map(({ key, icon }) => (
            <TouchableOpacity
              key={key}
              onPress={() => {
                markAttendance(item.id, selectedDate, key);
                handleMarkAttendance(item);
              }}
              style={[
                styles.btn,
                cur === key && {
                  backgroundColor: S_BG[key],
                  borderColor: S_BG[key],
                },
                isLocked && styles.btnDisabled,
              ]}
              disabled={isLocked || !canMark}
              activeOpacity={0.7}
            >
              <Icon name={icon} size={20} color={cur === key ? S_FG[key] : '#D1D5DB'} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => handleMarkAttendance(item)}
            style={[styles.noteBtn, hasNote && styles.noteBtnActive, isLocked && styles.btnDisabled]}
            disabled={isLocked || !canMark}
          >
            <Icon 
              name={hasNote ? 'document-text' : 'document-text-outline'} 
              size={18} 
              color={hasNote ? '#2563EB' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderDatePicker = () => {
    const displayMonth = currentMonth.getMonth();
    const displayYear = currentMonth.getFullYear();
    const firstDay = new Date(displayYear, displayMonth, 1).getDay();
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarEmptyDay} />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const status = staffList.length > 0 ? staffList[0]?.attendance?.[dateStr] : null;
      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.calendarDay,
            isSelected && styles.calendarDaySelected,
            status && { backgroundColor: status === 'P' ? '#D1FAE5' : status === 'A' ? '#FEE2E2' : '#FEF3C7' },
          ]}
          onPress={() => {
            setSelectedDate(dateStr);
            setShowDatePicker(false);
          }}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                <Icon name="chevron-back" size={24} color="#2563EB" />
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>{monthNames[displayMonth]} {displayYear}</Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                <Icon name="chevron-forward" size={24} color="#2563EB" />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarHeaderText}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {days}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderNoteModal = () => (
    <Modal visible={showNoteModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.noteModal}>
          <View style={styles.noteModalHeader}>
            <Text style={styles.noteModalTitle}>Add Note (Optional)</Text>
            <TouchableOpacity onPress={handleSaveNote}>
              <Icon name="checkmark" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note for this attendance..."
            placeholderTextColor="#9CA3AF"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Attendance</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar-outline" size={14} color="#2563EB" />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            <Icon name="chevron-down" size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatNum}>{staffList.length}</Text>
          <Text style={styles.headerStatLabel}>Staff</Text>
        </View>
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="checkmark-circle" size={16} color="#065F46" />
          </View>
          <Text style={[styles.summaryNum, { color: '#065F46' }]}>{present}</Text>
          <Text style={styles.summaryLbl}>Present</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="close-circle" size={16} color="#991B1B" />
          </View>
          <Text style={[styles.summaryNum, { color: '#991B1B' }]}>{absent}</Text>
          <Text style={styles.summaryLbl}>Absent</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="time-outline" size={16} color="#92400E" />
          </View>
          <Text style={[styles.summaryNum, { color: '#92400E' }]}>{leave}</Text>
          <Text style={styles.summaryLbl}>Leave</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#F3F4F6' }]}>
            <Icon name="remove-circle-outline" size={16} color="#6B7280" />
          </View>
          <Text style={[styles.summaryNum, { color: '#6B7280' }]}>{unmarked}</Text>
          <Text style={styles.summaryLbl}>Pending</Text>
        </View>
      </View>

      {staffList.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Icon name="people-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No staff added</Text>
          <Text style={styles.emptyText}>Add staff first from the Staff tab.</Text>
        </View>
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderItem}
        />
      )}

      {renderDatePicker()}
      {renderNoteModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerLeft: { flex: 1 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dateText: { fontSize: 13, color: '#2563EB', fontWeight: '500', marginHorizontal: 4 },
  headerStats: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerStatNum: { fontSize: 18, fontWeight: '700', color: '#2563EB' },
  headerStatLabel: { fontSize: 10, color: '#2563EB', fontWeight: '500' },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryNum: { fontSize: 20, fontWeight: '700' },
  summaryLbl: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#E5E7EB' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  rowLocked: { opacity: 0.7 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLocked: { backgroundColor: '#E5E7EB' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  avatarTextLocked: { color: '#9CA3AF' },
  nameCol: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  nameLocked: { color: '#6B7280' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  role: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  btnGroup: { flexDirection: 'row', gap: 8 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  btnDisabled: { opacity: 0.5 },
  noteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noteBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
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
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  datePickerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  dateList: { maxHeight: 300 },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dateItemSelected: { backgroundColor: '#EFF6FF' },
  dateItemText: { fontSize: 15, color: '#374151' },
  dateItemTextSelected: { color: '#2563EB', fontWeight: '600' },
  noteModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 16,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  noteModalTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  noteInput: {
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  calendarHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarEmptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#374151',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default DailyScreen;