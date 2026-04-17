import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Pressable, Alert, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getAllStaff, getAttendanceByDate, markAttendance } from '../database/db';
import { Calendar } from 'react-native-calendars';
import { applyStaffLocking } from '../utils/staffAccessControl';
import { showLockedAlert, addPlanChangeListener } from '../services/planService';

const S_BG  = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const S_FG  = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const S_ICON = { P: 'checkmark-circle', A: 'close-circle', L: 'time-outline' };

export default function DailyScreen() {
  const [staff,      setStaff]      = useState([]);
  const [attendance, setAttendance] = useState({});
  const [notes, setNotes] = useState({});
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [marking, setMarking] = useState({});
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handlePlanChange = () => {
      console.log('[DailyScreen] Plan changed, reloading data');
      load();
    };
    const removePlanListener = addPlanChangeListener(handlePlanChange);
    return () => removePlanListener();
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await getAllStaff();
      if (!list || !Array.isArray(list)) {
        setStaff([]);
        return;
      }
      const lockedList = await applyStaffLocking(list);
      const records = await getAttendanceByDate(selectedDate);
      const attMap = {};
      const noteMap = {};
      records.forEach(r => { 
        attMap[r.staff_id] = r.status;
        if (r.note) noteMap[r.staff_id] = r.note;
      });
      setStaff(lockedList || []);
      setAttendance(attMap);
      setNotes(noteMap);
    } catch (error) {
      console.log('[DailyScreen] load error:', error);
      setStaff([]);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mark = async (staffId, status) => {
    const staffMember = staff.find(s => s.id === staffId);
    if (staffMember?.isLocked) {
      showLockedAlert();
      return;
    }
    
    if (marking[staffId]) return;
    
    setMarking(prev => ({ ...prev, [staffId]: true }));
    try {
      await markAttendance(staffId, selectedDate, status, notes[staffId] || '');
      setAttendance(prev => ({ ...prev, [staffId]: status }));
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setMarking(prev => ({ ...prev, [staffId]: false }));
    }
  };

  const openNoteModal = (item) => {
    setSelectedStaff(item);
    setNoteText(notes[item.id] || '');
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    if (!selectedStaff || savingNote) return;
    
    setSavingNote(true);
    
    try {
      const currentStatus = attendance[selectedStaff.id] || 'P';
      const noteToSave = noteText.trim() || '';
      
      await markAttendance(selectedStaff.id, selectedDate, currentStatus, noteToSave);
      
      if (noteToSave) {
        setNotes(prev => ({ ...prev, [selectedStaff.id]: noteToSave }));
      } else {
        const newNotes = { ...notes };
        delete newNotes[selectedStaff.id];
        setNotes(newNotes);
      }
      
      Alert.alert('Success', 'Note saved');
      setShowNoteModal(false);
      setSelectedStaff(null);
      setNoteText('');
    } catch (error) {
      console.log('Save note error:', error);
      Alert.alert('Error', 'Failed to save note. Try again.');
    } finally {
      setSavingNote(false);
    }
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
    const hasNote = notes[item.id];
    const isLocked = item.isLocked;
    return (
      <View style={[styles.row, isLocked && styles.rowLocked]}>
        <View style={[styles.avatar, isLocked && styles.avatarLocked]}>
          <Text style={[styles.avatarText, isLocked && styles.avatarTextLocked]}>{item.name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.nameCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isLocked && styles.nameLocked]}>{item.name}</Text>
            {isLocked && (
              <Ionicons name="lock-closed" size={12} color="#9CA3AF" style={{ marginLeft: 4 }} />
            )}
          </View>
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
            <TouchableOpacity 
              key={key} 
              onPress={() => isLocked ? showLockedAlert() : mark(item.id, key)}
              style={[
                styles.btn, 
                cur === key && { backgroundColor: S_BG[key], borderColor: S_BG[key] },
                isLocked && styles.btnDisabled
              ]}
              disabled={isLocked}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={icon} 
                size={20} 
                color={cur === key ? S_FG[key] : '#D1D5DB'} 
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            onPress={() => isLocked ? showLockedAlert() : openNoteModal(item)}
            style={[styles.noteBtn, hasNote && styles.noteBtnActive, isLocked && styles.btnDisabled]}
            disabled={isLocked}
          >
            <Ionicons 
              name={hasNote ? 'document-text' : 'document-text-outline'} 
              size={18} 
              color={hasNote ? '#2563EB' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Attendance</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={14} color="#2563EB" />
            <Text style={styles.dateText}>{dayjs(selectedDate).format('DD MMM YYYY')}</Text>
            <Ionicons name="chevron-down" size={14} color="#2563EB" />
          </TouchableOpacity>
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

      <Modal visible={showNoteModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowNoteModal(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder="Enter note for today..."
              placeholderTextColor="#9CA3AF"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowNoteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveBtn}
                onPress={saveNote}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      
      <Modal visible={showDatePicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.calendarModal} onPress={() => {}}>
            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowDatePicker(false);
              }}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#2563EB' }
              }}
              theme={{
                todayTextColor: '#2563EB',
                arrowColor: '#2563EB',
                backgroundColor: '#fff',
                calendarBackground: '#fff',
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F3F4F6' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title:        { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerLeft:   { flex: 1 },
  dateButton:   { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  dateText:     { fontSize: 13, color: '#2563EB', fontWeight: '500', marginHorizontal: 4 },
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
  rowLocked:    { opacity: 0.7 },
  avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarLocked: { backgroundColor: '#E5E7EB' },
  avatarText:   { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  avatarTextLocked: { color: '#9CA3AF' },
  nameCol:      { flex: 1 },
  name:         { fontSize: 15, fontWeight: '600', color: '#111827' },
  nameLocked:   { color: '#6B7280' },
  nameRow:      { flexDirection: 'row', alignItems: 'center' },
  roleRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  role:         { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  btnGroup:     { flexDirection: 'row', gap: 8 },
  btn:          { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  btnDisabled:  { opacity: 0.5 },
  noteBtn:      { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  noteBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox:     { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: '600', color: '#111827' },
  noteInput:    { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', minHeight: 100, borderWidth: 1, borderColor: '#E5E7EB' },
  modalBtns:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn:{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelText:{ fontSize: 15, fontWeight: '600', color: '#6B7280' },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  modalSaveText:{ fontSize: 15, fontWeight: '600', color: '#fff' },
  calendarModal: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: '100%', maxWidth: 400 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:   { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText:    { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});