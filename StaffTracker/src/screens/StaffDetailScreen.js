import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import {
  getStaffById, deleteStaff,
  getAttendanceByStaffAndMonth, getMonthlyAdvances,
  addAdvance, deleteAdvance
} from '../database/db';
import { calculateSalary } from '../utils/salary';
import { syncData } from '../services/syncManager';

const STATUS_BG   = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const STATUS_FG   = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const STATUS_ICON = { P: 'checkmark-circle', A: 'close-circle', L: 'time-outline' };

export default function StaffDetailScreen({ route, navigation }) {
  const { staffId } = route.params;
  const now = dayjs();
  const insets = useSafeAreaInsets();

  const [staff,      setStaff]      = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [advances,   setAdvances]   = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [modalVisible, setModal]    = useState(false);
  const [advAmount,  setAdvAmount]  = useState('');
  const [advDate,    setAdvDate]    = useState(dayjs().format('YYYY-MM-DD'));
  const [advNote,    setAdvNote]    = useState('');

  const load = useCallback(async () => {
    const s = await getStaffById(staffId);
    setStaff(s);
    const att = await getAttendanceByStaffAndMonth(staffId, now.year(), now.month() + 1);
    setAttendance(att);
    const adv = await getMonthlyAdvances(staffId, now.year(), now.month() + 1);
    setAdvances(adv);
    setSummary(calculateSalary(s, att, adv, now.year(), now.month() + 1));
  }, [staffId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markedDates = {};
  const attendanceNotes = {};
  attendance.forEach(r => {
    markedDates[r.date] = {
      selected: true,
      selectedColor:     STATUS_BG[r.status],
      selectedTextColor: STATUS_FG[r.status],
    };
    if (r.note) {
      attendanceNotes[r.date] = r.note;
    }
  });

  const noteDates = Object.keys(attendanceNotes);
  const hasNotes = noteDates.length > 0;

  const getDurationLabel = (type) => {
    switch (type) {
      case 'daily': return 'Daily';
      case 'monthly': return 'Monthly';
      case 'manual': return 'Custom Period';
      default: return 'Monthly';
    }
  };

  const getDurationIcon = (type) => {
    switch (type) {
      case 'daily': return 'today';
      case 'monthly': return 'calendar-outline';
      case 'manual': return 'time-outline';
      default: return 'calendar-outline';
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Staff',
      `This will remove ${staff?.name} from all synced devices.\n\nAre you sure you want to delete?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteStaff(staffId);
          await syncData();
          navigation.goBack();
        }},
      ]
    );
  };

  const handleAddAdvance = async () => {
    if (!advAmount || isNaN(parseFloat(advAmount))) {
      Alert.alert('Invalid', 'Please enter a valid amount.');
      return;
    }
    await addAdvance(staffId, parseFloat(advAmount), advDate, advNote);
    await syncData();
    setModal(false);
    setAdvAmount('');
    setAdvNote('');
    load();
  };

  const handleDeleteAdvance = (id) => {
    Alert.alert('Delete Advance', 'Remove this advance record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteAdvance(id);
        load();
      }},
    ]);
  };

  if (!staff) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditStaff', { staffId })} style={styles.headerBtn}>
          <Ionicons name="create-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{staff.name[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.staffName}>{staff.name}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="briefcase-outline" size={14} color="#2563EB" />
            <Text style={styles.roleText}>{staff.position}</Text>
          </View>
          
          <View style={styles.metaRow}>
            {staff.phone ? (
              <View style={styles.metaItem}>
                <View style={styles.metaIcon}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                </View>
                <Text style={styles.metaText}>{staff.phone}</Text>
              </View>
            ) : null}
            {staff.join_date ? (
              <View style={styles.metaItem}>
                <View style={styles.metaIcon}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                </View>
                <Text style={styles.metaText}>Joined {dayjs(staff.join_date).format('DD MMM YYYY')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.salaryCard}>
            <View style={styles.salaryMain}>
              <Text style={styles.salaryLabel}>Salary</Text>
              <Text style={styles.salaryAmount}>₹{staff.salary}</Text>
            </View>
            <View style={styles.salaryDivider} />
            <View style={styles.salaryRight}>
              <Ionicons name={getDurationIcon(staff.salary_type)} size={18} color="#2563EB" />
              <Text style={styles.salaryType}>{getDurationLabel(staff.salary_type)}</Text>
            </View>
          </View>

          {(staff.sunday_holiday === 1 || staff.note) && (
            <View style={styles.infoCard}>
              {staff.sunday_holiday === 1 && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar-outline" size={16} color="#6366F1" />
                  </View>
                  <Text style={styles.infoText}>Sunday holiday enabled</Text>
                </View>
              )}
              {staff.note && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                  </View>
                  <Text style={styles.infoText}>{staff.note}</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Delete Staff</Text>
          </TouchableOpacity>
        </View>

        {summary && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={18} color="#111827" />
              <Text style={styles.sectionTitle}>{now.format('MMMM YYYY')} — Summary</Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryBox, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#065F46" style={{ marginBottom: 4 }} />
                <Text style={[styles.summaryVal, { color: '#065F46' }]}>{summary.present}</Text>
                <Text style={[styles.summaryLbl, { color: '#065F46' }]}>Present</Text>
              </View>
              <View style={[styles.summaryBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle" size={20} color="#991B1B" style={{ marginBottom: 4 }} />
                <Text style={[styles.summaryVal, { color: '#991B1B' }]}>{summary.absent}</Text>
                <Text style={[styles.summaryLbl, { color: '#991B1B' }]}>Absent</Text>
              </View>
              <View style={[styles.summaryBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={20} color="#92400E" style={{ marginBottom: 4 }} />
                <Text style={[styles.summaryVal, { color: '#92400E' }]}>{summary.leave}</Text>
                <Text style={[styles.summaryLbl, { color: '#92400E' }]}>Leave</Text>
              </View>
              {staff.salary_type !== 'daily' && (
                <View style={[styles.summaryBox, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="remove-circle-outline" size={20} color="#6B7280" style={{ marginBottom: 4 }} />
                  <Text style={[styles.summaryVal, { color: '#6B7280' }]}>{summary.unmarked}</Text>
                  <Text style={[styles.summaryLbl, { color: '#6B7280' }]}>Unmarked</Text>
                </View>
              )}
            </View>
            <View style={styles.salaryBreakdown}>
              {staff.salary_type === 'daily' ? (
                <View style={styles.breakRow}>
                  <Text style={styles.breakLabel}>Days worked ({summary.paidDays} days × ₹{staff.salary})</Text>
                  <Text style={styles.breakValue}>₹{summary.grossSalary}</Text>
                </View>
              ) : (
                <View style={styles.breakRow}>
                  <Text style={styles.breakLabel}>Paid days ({summary.paidDays} / {summary.daysInMonth})</Text>
                  <Text style={styles.breakValue}>₹{summary.grossSalary}</Text>
                </View>
              )}
              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Advances deducted</Text>
                <Text style={[styles.breakValue, { color: '#DC2626' }]}>- ₹{summary.totalAdvances}</Text>
              </View>
              <View style={[styles.breakRow, styles.breakTotal]}>
                <Text style={styles.breakTotalLabel}>Net payable</Text>
                <Text style={styles.breakTotalValue}>₹{summary.netPayable}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Attendance Calendar</Text>
          </View>
          <View style={styles.legend}>
            {[['P','Present','#D1FAE5','#065F46'],['A','Absent','#FEE2E2','#991B1B'],['L','Leave','#FEF3C7','#92400E']].map(([k,l,bg,fg]) => (
              <View key={k} style={[styles.legendPill, { backgroundColor: bg }]}>
                <Text style={[styles.legendText, { color: fg }]}>{l}</Text>
              </View>
            ))}
          </View>
          <Calendar
            markedDates={markedDates}
            style={styles.calendar}
            current={now.format('YYYY-MM-DD')}
            theme={{
              todayTextColor: '#2563EB',
              arrowColor: '#2563EB',
              backgroundColor: '#fff',
              calendarBackground: '#fff',
            }}
          />
        </View>

        {hasNotes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color="#111827" />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            {noteDates.map(date => (
              <View key={date} style={styles.noteItem}>
                <View style={styles.noteDateRow}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <Text style={styles.noteDate}>{dayjs(date).format('DD MMM YYYY')}</Text>
                </View>
                <Text style={styles.noteText}>{attendanceNotes[date]}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Advance Payments</Text>
          </View>
          <TouchableOpacity style={styles.addAdvanceBtn} onPress={() => setModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
            <Text style={styles.addAdvanceText}>Add Advance</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Advance Payment</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="wallet-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={advAmount}
                  onChangeText={setAdvAmount}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={advDate}
                  onChangeText={setAdvDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note (optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="document-text-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={advNote}
                  onChangeText={setAdvNote}
                  placeholder="Enter note"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddAdvance}>
                <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  profileCard: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTextLarge: { fontSize: 28, fontWeight: '700', color: '#1D4ED8' },
  staffName: { fontSize: 22, fontWeight: '600', color: '#111827', marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  roleText: { fontSize: 13, fontWeight: '500', color: '#2563EB', marginLeft: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  metaText: { fontSize: 13, color: '#6B7280' },
  salaryCard: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, width: '100%', marginBottom: 16 },
  salaryMain: { flex: 1 },
  salaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  salaryAmount: { fontSize: 24, fontWeight: '700', color: '#059669' },
  salaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  salaryRight: { alignItems: 'center', justifyContent: 'center' },
  salaryType: { fontSize: 13, fontWeight: '500', color: '#2563EB', marginTop: 4 },
  infoCard: { backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14, width: '100%', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  infoText: { fontSize: 13, color: '#374151', flex: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  deleteBtnText: { fontSize: 13, fontWeight: '500', color: '#DC2626', marginLeft: 6 },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginLeft: 8 },
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryVal: { fontSize: 22, fontWeight: '700' },
  summaryLbl: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  salaryBreakdown: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  breakLabel: { fontSize: 13, color: '#6B7280' },
  breakValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  breakTotal: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4, marginBottom: 0 },
  breakTotalLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  breakTotalValue: { fontSize: 18, fontWeight: '700', color: '#059669' },
  legend: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  legendPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  legendText: { fontSize: 12, fontWeight: '500' },
  calendar: { borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  addAdvanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#DBEAFE', backgroundColor: '#EFF6FF' },
  addAdvanceText: { fontSize: 14, fontWeight: '600', color: '#2563EB', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10 },
  inputIcon: { marginLeft: 12 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#111827' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', padding: 14, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontWeight: '600', color: '#6B7280' },
  modalSave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', padding: 14, borderRadius: 10 },
  modalSaveText: { fontWeight: '600', color: '#fff' },
  noteItem: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 10 },
  noteDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  noteDate: { fontSize: 12, color: '#6B7280', marginLeft: 6 },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 20 },
});