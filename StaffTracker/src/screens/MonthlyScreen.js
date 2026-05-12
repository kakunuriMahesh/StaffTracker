import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getAllStaff, getAttendanceByStaffAndMonth, getAttendanceByDateRange, getMonthlyAdvances, getAdvancesByDateRange, markAttendance } from '../database/db';
import { calculateSalary } from '../utils/salary';
import { applyStaffLocking } from '../utils/staffAccessControl';
import { addPlanChangeListener } from '../services/planService';
import { showLockedAlert } from '../utils/upgradeHelper';

const FILTER_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'daily', label: 'Daily' },
];

export default function MonthlyScreen() {
  const insets = useSafeAreaInsets();
  
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [periodDate, setPeriodDate] = useState(dayjs());
  const [showDropdown, setShowDropdown] = useState(false);
  const [showActionPopup, setShowActionPopup] = useState(false);
  const [actionDate, setActionDate] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [existingNote, setExistingNote] = useState('');
  const [reloadCounter, setReloadCounter] = useState(0);

  const filteredStaff = useMemo(() => {
    if (filterType === 'all') return staff;
    return staff.filter(s => (s.salary_type || 'monthly') === filterType);
  }, [staff, filterType]);

  useEffect(() => {
    const handlePlanChange = () => {
      console.log('[MonthlyScreen] Plan changed, reloading staff list');
      loadStaffList();
    };
    const removePlanListener = addPlanChangeListener(handlePlanChange);
    return () => removePlanListener();
  }, []);

  const loadStaffList = async () => {
    try {
      const list = await getAllStaff();
      if (!list || !Array.isArray(list)) {
        setStaff([]);
        return;
      }
      const lockedList = await applyStaffLocking(list);
      setStaff(lockedList || []);
      if (lockedList && lockedList.length > 0 && !selected) {
        setSelected(lockedList[0]);
      } else if (lockedList && lockedList.length > 0 && selected) {
        const updated = lockedList.find(s => s.id === selected.id);
        if (!updated) setSelected(lockedList[0]);
      }
    } catch (error) {
      console.log('[MonthlyScreen] loadStaffList error:', error);
      setStaff([]);
    }
  };

  const loadData = useCallback(async () => {
    if (!selected) return;
    
    let att;
    let advances = [];
    let startDate, endDate;
    const staffSalaryType = selected.salary_type || 'monthly';
    
    if (filterType === 'all') {
      startDate = selected.join_date || '2000-01-01';
      endDate = dayjs().format('YYYY-MM-DD');
      att = await getAttendanceByDateRange(selected.id, startDate, endDate);
      advances = await getAdvancesByDateRange(selected.id, startDate, endDate);
    } else if (filterType === 'monthly') {
      startDate = periodDate.startOf('month').format('YYYY-MM-DD');
      endDate = periodDate.endOf('month').format('YYYY-MM-DD');
      att = await getAttendanceByStaffAndMonth(selected.id, periodDate.year(), periodDate.month() + 1);
      advances = await getMonthlyAdvances(selected.id, periodDate.year(), periodDate.month() + 1);
    } else if (filterType === 'weekly') {
      startDate = periodDate.startOf('week').format('YYYY-MM-DD');
      endDate = periodDate.endOf('week').format('YYYY-MM-DD');
      att = await getAttendanceByDateRange(selected.id, startDate, endDate);
      advances = await getAdvancesByDateRange(selected.id, startDate, endDate);
    } else {
      startDate = periodDate.format('YYYY-MM-DD');
      endDate = periodDate.format('YYYY-MM-DD');
      att = await getAttendanceByDateRange(selected.id, startDate, endDate);
      advances = await getAdvancesByDateRange(selected.id, startDate, endDate);
    }
    
    setAttendance(att);
    
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const days = end.diff(start, 'day') + 1;
    
    const present = att.filter(r => r.status === 'P').length;
    const leave = att.filter(r => r.status === 'L').length;
    const absent = att.filter(r => r.status === 'A').length;
    const unmarked = days - present - leave - absent;
    
    let paidDays, salaryToUse;
    
    if (staffSalaryType === 'daily') {
      paidDays = present;
      salaryToUse = present * selected.salary;
    } else if (staffSalaryType === 'weekly') {
      paidDays = present + leave;
      salaryToUse = (selected.salary / 7) * paidDays;
    } else {
      paidDays = present + leave;
      salaryToUse = (selected.salary / days) * paidDays;
    }
    
    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    const netPayable = salaryToUse - totalAdvances;
    
    setSummary({
      daysInMonth: days,
      present,
      leave,
      absent,
      unmarked,
      paidDays,
      grossSalary: parseFloat(salaryToUse.toFixed(2)),
      totalAdvances,
      netPayable: parseFloat(netPayable.toFixed(2)),
      startDate,
      endDate,
    });
  }, [selected, filterType, periodDate]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadStaffList();
        setReloadCounter(c => c + 1);
      })();
    }, [])
  );

  React.useEffect(() => {
    if (selected && !filteredStaff.find(s => s.id === selected.id)) {
      setSelected(filteredStaff[0] || null);
    }
  }, [filteredStaff]);

  React.useEffect(() => {
    if (selected) loadData();
  }, [loadData, reloadCounter]);

  const handleSelectStaff = (s) => {
    setSelected(s);
  };

  const selectPeriod = (type) => {
    setFilterType(type);
    setShowDropdown(false);
  };

  const prevPeriod = () => {
    if (filterType === 'monthly') setPeriodDate(prev => prev.subtract(1, 'month'));
    else if (filterType === 'weekly') setPeriodDate(prev => prev.subtract(1, 'week'));
    else setPeriodDate(prev => prev.subtract(1, 'day'));
  };

  const nextPeriod = () => {
    if (filterType === 'monthly') setPeriodDate(prev => prev.add(1, 'month'));
    else if (filterType === 'weekly') setPeriodDate(prev => prev.add(1, 'week'));
    else setPeriodDate(prev => prev.add(1, 'day'));
  };

  const getPeriodLabel = () => {
    if (filterType === 'monthly') return periodDate.format('MMMM YYYY');
    if (filterType === 'weekly') {
      const start = periodDate.startOf('week');
      const end = periodDate.endOf('week');
      return `${start.format('DD MMM')} - ${end.format('DD MMM YYYY')}`;
    }
    return periodDate.format('DD MMMM YYYY');
  };

  const openActionPopup = (date) => {
    if (!selected) return;
    if (selected.isLocked) {
      showLockedAlert();
      return;
    }
    const existing = attendance.find(a => a.date === date);
    setActionDate(date);
    setExistingNote(existing?.note || '');
    setShowActionPopup(true);
  };

  const handleQuickMark = async (status) => {
    if (!actionDate || !selected) return;
    setShowActionPopup(false);
    try {
      const existing = attendance.find(a => a.date === actionDate);
      await markAttendance(selected.id, actionDate, status, existing?.note || '');
      loadData();
    } catch (error) {
      console.log('Mark attendance error:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const openNoteModal = () => {
    setShowActionPopup(false);
    setNoteText(existingNote);
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    if (!actionDate) return;
    try {
      const existing = attendance.find(a => a.date === actionDate);
      const currentStatus = existing?.status || 'P';
      await markAttendance(selected.id, actionDate, currentStatus, noteText.trim());
      setShowNoteModal(false);
      setNoteText('');
      loadData();
    } catch (error) {
      console.log('Save note error:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const sharePayslip = async () => {
    if (!selected || !summary) return;
    const html = `
      <html><body style="font-family:sans-serif;padding:24px;max-width:400px;margin:0 auto">
        <h2 style="color:#1D4ED8">Salary Slip — ${dayjs(summary.startDate).format('DD MMM')} - ${dayjs(summary.endDate).format('DD MMM YYYY')}</h2>
        <hr/>
        <p><b>Name:</b> ${selected.name}</p>
        <p><b>Position:</b> ${selected.position}</p>
        <p><b>Base Salary:</b> ₹${selected.salary}</p>
        <hr/>
        <p><b>Days in period:</b> ${summary.daysInMonth}</p>
        <p><b>Present:</b> ${summary.present} days</p>
        <p><b>Leave:</b> ${summary.leave} days</p>
        <p><b>Absent:</b> ${summary.absent} days</p>
        <p><b>Paid days:</b> ${summary.paidDays}</p>
        <hr/>
        <p><b>Gross salary:</b> ₹${summary.grossSalary}</p>
        <p><b>Advances deducted:</b> ₹${summary.totalAdvances}</p>
        <h3 style="color:#059669">Net Payable: ₹${summary.netPayable}</h3>
        <hr/>
        <p style="font-size:12px;color:#9CA3AF">Generated by StaffTracker</p>
      </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Payslip' });
  };

  const getFilterLabel = () => {
    const found = FILTER_TYPES.find(t => t.key === filterType);
    return found ? found.label : 'All';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {filterType !== 'all' && (
          <View style={styles.periodNav}>
            <TouchableOpacity onPress={prevPeriod} style={styles.periodArrow}>
              <Ionicons name="chevron-back" size={22} color="#2563EB" />
            </TouchableOpacity>
            <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>
            <TouchableOpacity onPress={nextPeriod} style={styles.periodArrow}>
              <Ionicons name="chevron-forward" size={22} color="#2563EB" />
            </TouchableOpacity>
          </View>
        )}
        {filterType === 'all' && (
          <Text style={styles.periodLabelAll}>All Periods</Text>
        )}
        <View style={styles.filterBtnWrapper}>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDropdown(!showDropdown)}>
            <Ionicons name="filter" size={16} color="#2563EB" />
            <Text style={styles.dropdownBtnText}>{getFilterLabel()}</Text>
            <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pillRowContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRowContent}
        >
          {filteredStaff.map(s => (
            <TouchableOpacity
              key={s.id}
              onPress={() => handleSelectStaff(s)}
              style={[styles.pill, selected?.id === s.id && styles.pillOn]}
              activeOpacity={0.7}
            >
              <View style={[styles.pillAvatar, selected?.id === s.id && styles.pillAvatarOn]}>
                <Text style={[styles.pillAvatarText, selected?.id === s.id && styles.pillAvatarTextOn]}>
                  {s.name[0].toUpperCase()}
                </Text>
              </View>
              <Text
                style={[styles.pillText, selected?.id === s.id && styles.pillTextOn]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selected && (
        <>
          {summary && (
            <View style={styles.summaryCard}>
              <View style={styles.periodBadge}>
                <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                <Text style={styles.periodBadgeText}>
                  {`${dayjs(summary.startDate).format('DD MMM YYYY')} — ${dayjs(summary.endDate).format('DD MMM YYYY')}`}
                </Text>
              </View>
              <View style={styles.staffInfoRow}>
                <View style={styles.staffAvatarSm}>
                  <Text style={styles.staffAvatarSmText}>{selected.name[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.staffInfoName}>{selected.name}</Text>
                  <Text style={styles.staffInfoPos}>{selected.position}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                {[
                  [summary.present,'Present','#D1FAE5','#065F46'],
                  [summary.absent, 'Absent', '#FEE2E2','#991B1B'],
                  [summary.leave,  'Leave',  '#FEF3C7','#92400E'],
                ].map(([v,l,bg,fg]) => (
                  <View key={l} style={[styles.statBox,{backgroundColor:bg}]}>
                    <Text style={[styles.statVal,{color:fg}]}>{v}</Text>
                    <Text style={[styles.statLbl,{color:fg}]}>{l}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.breakdown}>
                <View style={styles.bRow}><Text style={styles.bLabel}>Base salary</Text><Text style={styles.bValue}>₹{selected.salary}/{selected.salary_type === 'daily' ? 'day' : selected.salary_type === 'weekly' ? 'week' : 'month'}</Text></View>
                <View style={styles.bRow}><Text style={styles.bLabel}>Paid days</Text><Text style={styles.bValue}>{summary.paidDays} / {summary.daysInMonth}</Text></View>
                <View style={styles.bRow}><Text style={styles.bLabel}>Gross salary</Text><Text style={styles.bValue}>₹{summary.grossSalary}</Text></View>
                <View style={styles.bRow}><Text style={styles.bLabel}>Advances</Text><Text style={[styles.bValue,{color:'#DC2626'}]}>- ₹{summary.totalAdvances}</Text></View>
                <View style={[styles.bRow,styles.bTotalRow]}>
                  <Text style={styles.bTotalLabel}>Net payable</Text>
                  <Text style={styles.bTotalValue}>₹{summary.netPayable}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={sharePayslip}>
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share Payslip</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      {filteredStaff.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Add staff first from the Staff tab.</Text></View>
      )}

      {showDropdown && (
        <Pressable style={styles.dropdownOverlay} onPress={() => setShowDropdown(false)}>
          <View style={[styles.dropdownMenu, { top: (insets.top || 40) + 52 }]}>
            {FILTER_TYPES.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[styles.dropdownItem, filterType === type.key && styles.dropdownItemActive]}
                onPress={() => selectPeriod(type.key)}
              >
                <Ionicons
                  name={filterType === type.key ? 'radio-button-on' : 'ellipse-outline'}
                  size={18}
                  color={filterType === type.key ? '#2563EB' : '#6B7280'}
                />
                <Text style={[styles.dropdownItemText, filterType === type.key && styles.dropdownItemTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}

      <Modal visible={showActionPopup} transparent animationType="fade" onRequestClose={() => setShowActionPopup(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setShowActionPopup(false)}>
          <Pressable style={styles.actionPopup} onPress={() => {}}>
            <Text style={styles.actionTitle}>
              {actionDate ? dayjs(actionDate).format('DD MMM YYYY') : ''}
            </Text>
            <Text style={styles.actionSubtitle}>Mark attendance:</Text>
            <View style={styles.actionBtns}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnP]} onPress={() => handleQuickMark('P')}>
                <Ionicons name="checkmark-circle" size={24} color="#065F46" />
                <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnA]} onPress={() => handleQuickMark('A')}>
                <Ionicons name="close-circle" size={24} color="#991B1B" />
                <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Absent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnL]} onPress={() => handleQuickMark('L')}>
                <Ionicons name="time-outline" size={24} color="#92400E" />
                <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnNote]} onPress={openNoteModal}>
                <Ionicons name="document-text-outline" size={24} color="#2563EB" />
                <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Note</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.actionCancelBtn} onPress={() => setShowActionPopup(false)}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showNoteModal} transparent animationType="fade" onRequestClose={() => setShowNoteModal(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setShowNoteModal(false)}>
          <Pressable style={styles.noteModalBox} onPress={() => {}}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.quickNoteDate}>
              {actionDate ? dayjs(actionDate).format('DD MMMM YYYY') : ''}
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Enter note..."
              placeholderTextColor="#9CA3AF"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => { setShowNoteModal(false); setNoteText(''); }}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveBtn}
                onPress={saveNote}
              >
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F3F4F6' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  periodNav:   { flexDirection: 'row', alignItems: 'center', flex: 1 },
  periodArrow: { padding: 6 },
  periodLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginHorizontal: 8 },
  periodLabelAll: { fontSize: 16, fontWeight: '600', color: '#111827' },
  filterBtnWrapper: {},
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  dropdownBtnText: { fontSize: 13, color: '#2563EB', marginHorizontal: 6, fontWeight: '600' },
  dropdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  dropdownMenu: { position: 'absolute', right: 16, backgroundColor: '#fff', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, width: 160 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#374151', marginLeft: 10 },
  dropdownItemTextActive: { color: '#2563EB', fontWeight: '600' },
  pillRowContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', height: 86, justifyContent: 'center' },
  pillRowContent: { paddingHorizontal: 16, alignItems: 'center', gap: 10 },
  pill:        { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', minWidth: 66 },
  pillOn:      { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillAvatar:  { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  pillAvatarOn: { backgroundColor: '#1D4ED8' },
  pillAvatarText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  pillAvatarTextOn: { color: '#fff' },
  pillText:    { fontSize: 12, fontWeight: '600', color: '#374151', maxWidth: 64 },
  pillTextOn:  { color: '#fff' },
  summaryCard: { margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  periodBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 12, alignSelf: 'flex-start' },
  periodBadgeText: { fontSize: 12, color: '#2563EB', marginLeft: 6, fontWeight: '500' },
  staffInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  staffAvatarSm: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  staffAvatarSmText: { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  staffInfoName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  staffInfoPos: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statsRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox:     { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statVal:     { fontSize: 24, fontWeight: '700' },
  statLbl:     { fontSize: 11, fontWeight: '500', marginTop: 2 },
  breakdown:   { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 },
  bRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bLabel:      { fontSize: 13, color: '#6B7280' },
  bValue:      { fontSize: 13, fontWeight: '500', color: '#111827' },
  bTotalRow:   { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4, marginBottom: 0 },
  bTotalLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  bTotalValue: { fontSize: 18, fontWeight: '700', color: '#059669' },
  shareBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', padding: 14, borderRadius: 12 },
  shareBtnText:{ color: '#fff', fontWeight: '600', fontSize: 15, marginLeft: 8 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:   { fontSize: 14, color: '#9CA3AF' },
  modalTitle:   { fontSize: 18, fontWeight: '600', color: '#111827' },
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
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quickNoteDate: { fontSize: 13, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  noteInput: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', minHeight: 100, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  modalSaveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
