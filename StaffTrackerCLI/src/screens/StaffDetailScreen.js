import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { showToast } from '../components/Toast';

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
  const { staffList, deleteStaff, archiveStaff, unarchiveStaff, isStaffLocked, canEditStaff, getAttendance, getNote, getStaffNotes, markAttendance, notes, reloadData } = useApp();

  const staff = staffList.find((s) => s.id === staffId);
  const isLocked = staff ? isStaffLocked(staff) : false;
  const canEdit = staff ? canEditStaff(staff) : false;

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [attendNote, setAttendNote] = useState('');
  const [showActionPopup, setShowActionPopup] = useState(false);
  const [actionDate, setActionDate] = useState(null);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [existingNote, setExistingNote] = useState('');
  const [noteSortDesc, setNoteSortDesc] = useState(true);

  const currentStatus = staff ? getAttendance(staff.id, selectedDate) : null;

  const staffNotes = staff ? getStaffNotes(staff.id) : {};

  useFocusEffect(
    useCallback(() => {
      if (staff) {
        const storedNote = getNote(staff.id, selectedDate);
        setAttendNote(storedNote || '');
      }
    }, [selectedDate, staff, notes])
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

  const handleMarkAttendance = async (status) => {
    if (!canEdit || isLocked) return;
    await markAttendance(staff.id, selectedDate, status);
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    setShowNoteModal(false);
    setNoteText('');
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
      case 'Maid': return 'home-outline';
      case 'Cook': return 'restaurant-outline';
      case 'Driver': return 'car-outline';
      case 'Gardener': return 'leaf-outline';
      case 'Security': return 'shield-checkmark-outline';
      case 'Watchman': return 'eye-outline';
      default: return 'person-outline';
    }
  };

  const openActionPopup = (date) => {
    if (isLocked) {
      Alert.alert('Locked', 'This staff is locked. Upgrade to premium to edit.');
      return;
    }
    const existing = staffNotes[date] || '';
    setActionDate(date);
    setExistingNote(existing);
    setShowActionPopup(true);
  };

  const handleQuickMark = async (status) => {
    if (!actionDate || !staff) return;
    setShowActionPopup(false);
    try {
      const existingNote = staffNotes[actionDate] || '';
      await markAttendance(staff.id, actionDate, status, existingNote);
      reloadData();
    } catch (error) {
      console.log('Mark attendance error:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const openNoteModal = () => {
    setShowActionPopup(false);
    setQuickNoteText(existingNote);
    setShowQuickNote(true);
  };

  const saveQuickNote = async () => {
    if (!actionDate || !staff) return;
    try {
      const currentStatus = staffNotes[actionDate] || 'P';
      await markAttendance(staff.id, actionDate, currentStatus, quickNoteText.trim());
      setShowQuickNote(false);
      setQuickNoteText('');
      reloadData();
    } catch (error) {
      console.log('Save note error:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const renderDatePicker = () => {
    const today = new Date();
    const dates = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    return (
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dateList}>
              {dates.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.dateItem,
                    selectedDate === date && styles.dateItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateItemText,
                      selectedDate === date && styles.dateItemTextSelected,
                    ]}
                  >
                    {formatDate(date)}
                  </Text>
                  {selectedDate === date && (
                    <Icon name="checkmark" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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

  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const status = staff ? getAttendance(staff.id, dateStr) : null;
      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.calendarDay,
            status && { backgroundColor: STATUS_BG[status] },
          ]}
          onPress={() => openActionPopup(dateStr)}
          disabled={isLocked}
        >
          <Text style={[styles.calendarDayText, status && { color: STATUS_FG[status] }]}>
            {i}
          </Text>
          {status && (
            <Icon name={STATUS_ICON[status]} size={10} color={STATUS_FG[status]} />
          )}
        </TouchableOpacity>
      );
    }
    return days;
  };

  const formatDateForPopup = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sortedNoteDates = Object.keys(staffNotes).sort((a, b) => {
    return noteSortDesc 
      ? new Date(b).getTime() - new Date(a).getTime()
      : new Date(a).getTime() - new Date(b).getTime();
  });

  if (!staff) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
            <Icon name={getRoleIcon(staff.position)} size={16} color="#6B7280" />
            <Text style={styles.roleText}>{staff.position || 'Staff'}</Text>
          </View>
          {staff.note && (
            <View style={styles.noteContainer}>
              <Icon name="document-text-outline" size={14} color="#6B7280" />
              <Text style={styles.staffNote}>{staff.note}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.dateSelectBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={20} color="#2563EB" />
            <Text style={styles.dateSelectText}>{formatDate(selectedDate)}</Text>
            <Icon name="chevron-down" size={20} color="#2563EB" />
          </TouchableOpacity>

          <View style={styles.attendanceBtns}>
            {[
              { key: 'P', label: 'Present', icon: 'checkmark-circle', color: STATUS_BG.P, text: STATUS_FG.P },
              { key: 'A', label: 'Absent', icon: 'close-circle', color: STATUS_BG.A, text: STATUS_FG.A },
              { key: 'L', label: 'Leave', icon: 'time-outline', color: STATUS_BG.L, text: STATUS_FG.L },
              { key: null, label: 'Clear', icon: 'remove-circle-outline', color: '#F3F4F6', text: '#6B7280' },
            ].map(({ key, label, icon, color, text }) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.attendanceBtn,
                  currentStatus === key && styles.attendanceBtnActive,
                  { backgroundColor: currentStatus === key ? color : '#F9FAFB' },
                  isLocked && styles.attendanceBtnDisabled,
                ]}
                onPress={() => handleMarkAttendance(key)}
                disabled={isLocked || !canEdit}
              >
                <Icon name={icon} size={24} color={currentStatus === key ? text : '#D1D5DB'} />
                <Text style={[styles.attendanceBtnText, currentStatus === key && { color: text }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {attendNote ? (
            <View style={styles.attendNoteContainer}>
              <Icon name="document-text-outline" size={16} color="#6B7280" />
              <Text style={styles.attendNoteText}>{attendNote}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.calendarCard}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.calendarHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.calendarHeaderText}>{day}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {generateCalendarDays()}
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_BG.P }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_BG.A }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_BG.L }]} />
              <Text style={styles.legendText}>Leave</Text>
            </View>
          </View>
        </View>

        {Object.keys(staffNotes).length > 0 && (
          <View style={styles.notesSection}>
            <View style={styles.notesHeaderRow}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TouchableOpacity onPress={() => setNoteSortDesc(!noteSortDesc)} style={styles.sortBtn}>
                <Icon name={noteSortDesc ? 'arrow-down' : 'arrow-up'} size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {sortedNoteDates.map((date) => (
              <View key={date} style={styles.noteRow}>
                <View style={styles.noteDate}>
                  <Icon name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.noteDateText}>{formatDate(date)}</Text>
                </View>
                <Text style={styles.noteText}>{staffNotes[date]}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Details</Text>
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
              <Text style={styles.infoValue}>{formatDate(staff.joinedDate)}</Text>
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
                ₹{staff.salary || 0} / {staff.salary_type === 'daily' ? 'day' : 'month'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.deleteBtn, !canEdit && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!canEdit}
        >
          <Icon name="trash" size={18} color="#DC2626" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.archiveBtn, staff?.is_archived && styles.archiveBtnRestore]}
          onPress={async () => {
            if (staff?.is_archived) {
              Alert.alert(
                'Restore Staff',
                `Restore ${staff.name} from archive?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Restore', 
                    onPress: async () => {
                      await unarchiveStaff(staffId);
                      reloadData();
                      navigation.goBack();
                    }
                  },
                ]
              );
            } else {
              Alert.alert(
                'Archive Staff',
                `Archive ${staff.name}? They won't count towards your plan limit.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Archive', 
                    style: 'destructive',
                    onPress: async () => {
                      await archiveStaff(staffId);
                      showToast(
                        `${staff.name} archived`,
                        async () => {
                          await unarchiveStaff(staffId);
                        }
                      );
                      navigation.goBack();
                    }
                  },
                ]
              );
            }
          }}
        >
          <Icon name={staff?.is_archived ? 'arrow-up-circle-outline' : 'archive-outline'} size={18} color={staff?.is_archived ? '#2563EB' : '#6B7280'} />
          <Text style={[styles.archiveBtnText, staff?.is_archived && styles.archiveBtnTextRestore]}>
            {staff?.is_archived ? 'Restore' : 'Archive'}
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {renderDatePicker()}
      {renderNoteModal()}

      <Modal visible={showActionPopup} transparent animationType="fade" onRequestClose={() => setShowActionPopup(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setShowActionPopup(false)}>
          <Pressable style={styles.actionPopup} onPress={() => {}}>
            <Text style={styles.actionTitle}>
              {actionDate ? formatDateForPopup(actionDate) : ''}
            </Text>
            <Text style={styles.actionSubtitle}>Mark attendance:</Text>
            <View style={styles.actionBtns}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnP]} onPress={() => handleQuickMark('P')}>
                <Icon name="checkmark-circle" size={24} color="#065F46" />
                <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnA]} onPress={() => handleQuickMark('A')}>
                <Icon name="close-circle" size={24} color="#991B1B" />
                <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Absent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnL]} onPress={() => handleQuickMark('L')}>
                <Icon name="time-outline" size={24} color="#92400E" />
                <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnNote]} onPress={openNoteModal}>
                <Icon name="document-text-outline" size={24} color="#2563EB" />
                <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Note</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.actionCancelBtn} onPress={() => setShowActionPopup(false)}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showQuickNote} transparent animationType="fade" onRequestClose={() => setShowQuickNote(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setShowQuickNote(false)}>
          <Pressable style={styles.noteModalBox} onPress={() => {}}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>Add Note</Text>
              <TouchableOpacity onPress={() => setShowQuickNote(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteModalDate}>
              {actionDate ? formatDateForPopup(actionDate) : ''}
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Enter note..."
              placeholderTextColor="#9CA3AF"
              value={quickNoteText}
              onChangeText={setQuickNoteText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.noteModalBtns}>
              <TouchableOpacity 
                style={styles.noteModalCancelBtn}
                onPress={() => { setShowQuickNote(false); setQuickNoteText(''); }}
              >
                <Text style={styles.noteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.noteModalSaveBtn}
                onPress={saveQuickNote}
              >
                <Text style={styles.noteModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
  },
  avatarLocked: { backgroundColor: '#E5E7EB' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#1D4ED8' },
  avatarTextLocked: { color: '#9CA3AF' },
  lockedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6B7280', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  lockedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600', marginLeft: 4 },
  staffName: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  roleRow: { flexDirection: 'row', alignItems: 'center' },
  roleText: { fontSize: 14, color: '#6B7280', marginLeft: 6 },
  noteContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginTop: 12,
  },
  staffNote: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  dateSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, marginBottom: 16,
  },
  dateSelectText: { fontSize: 15, color: '#2563EB', fontWeight: '500' },
  attendanceBtns: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 8,
  },
  attendanceBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E2E8F0',
  },
  attendanceBtnActive: { borderColor: '#2563EB' },
  attendanceBtnDisabled: { opacity: 0.5 },
  attendanceBtnText: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginTop: 4 },
  attendNoteContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginTop: 12,
  },
  attendNoteText: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
  calendarCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  calendarHeader: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8,
  },
  calendarHeaderText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  calendarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, marginBottom: 4,
  },
  calendarDayText: { fontSize: 12, color: '#374151' },
  calendarLegend: {
    flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendText: { fontSize: 12, color: '#6B7280' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
  },
  infoIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEE2E2', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '500', marginLeft: 6 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 },
  archiveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  archiveBtnRestore: { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' },
  archiveBtnText: { color: '#6B7280', fontSize: 13, fontWeight: '500', marginLeft: 6 },
  archiveBtnTextRestore: { color: '#2563EB' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  datePickerModal: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%', maxHeight: '70%', overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  datePickerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  dateList: { maxHeight: 300 },
  dateItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  dateItemSelected: { backgroundColor: '#EFF6FF' },
  dateItemText: { fontSize: 15, color: '#374151' },
  dateItemTextSelected: { color: '#2563EB', fontWeight: '600' },
  noteModal: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%', padding: 16,
  },
  noteModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  noteModalTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  noteInput: {
    fontSize: 15, color: '#1E293B', paddingVertical: 12, minHeight: 100, textAlignVertical: 'top',
  },
  notesSection: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  noteDate: {
    flexDirection: 'row', alignItems: 'center', width: 100,
  },
  noteDateText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  noteText: { flex: 1, fontSize: 13, color: '#374151' },
  notesHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sortBtn: { padding: 4 },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  actionPopup: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%', maxWidth: 320 },
  actionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  actionSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  actionBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  actionBtn: { width: '47%', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnP: { backgroundColor: '#D1FAE5' },
  actionBtnA: { backgroundColor: '#FEE2E2' },
  actionBtnL: { backgroundColor: '#FEF3C7' },
  actionBtnNote: { backgroundColor: '#EFF6FF', width: '100%' },
  actionBtnText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  actionCancelBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
  actionCancelText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  noteModalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%', maxWidth: 320 },
  noteModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  noteModalDate: { fontSize: 13, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  noteModalBtns: { flexDirection: 'row', gap: 12 },
  noteModalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  noteModalCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  noteModalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  noteModalSaveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

const formatDateSimple = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default StaffDetailScreen;