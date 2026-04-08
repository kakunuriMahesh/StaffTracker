import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getAllStaff, getAttendanceByStaffAndMonth, getAttendanceByDateRange, getMonthlyAdvances, getAdvancesByDateRange } from '../database/db';
import { calculateSalary } from '../utils/salary';

const FILTER_TYPES = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'custom', label: 'Custom' },
];

export default function MonthlyScreen() {
  const now = dayjs();
  const insets = useSafeAreaInsets();
  
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterType, setFilterType] = useState('monthly');
  const [customStart, setCustomStart] = useState(now.startOf('month').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd] = useState(now.endOf('month').format('YYYY-MM-DD'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadStaffList = async () => {
    const list = await getAllStaff();
    setStaff(list);
    if (list.length > 0 && !selected) {
      setSelected(list[0]);
    }
  };

  const loadData = useCallback(async () => {
    if (!selected) return;
    
    let att;
    let advances = [];
    let startDate, endDate;
    
    if (filterType === 'monthly') {
      startDate = now.startOf('month').format('YYYY-MM-DD');
      endDate = now.endOf('month').format('YYYY-MM-DD');
      att = await getAttendanceByStaffAndMonth(selected.id, now.year(), now.month() + 1);
      advances = await getMonthlyAdvances(selected.id, now.year(), now.month() + 1);
    } else if (filterType === 'weekly') {
      startDate = now.startOf('week').format('YYYY-MM-DD');
      endDate = now.endOf('week').format('YYYY-MM-DD');
      att = await getAttendanceByDateRange(selected.id, startDate, endDate);
      advances = await getAdvancesByDateRange(selected.id, startDate, endDate);
    } else {
      startDate = customStart;
      endDate = customEnd;
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
    const paidDays = present + leave;
    
    let salaryToUse;
    if (filterType === 'weekly' || (selected.salary_type === 'weekly')) {
      const weeklyDays = 7;
      salaryToUse = (selected.salary / weeklyDays) * paidDays;
    } else if (filterType === 'custom' || selected.salary_type === 'manual') {
      const daysInMonth = now.daysInMonth();
      salaryToUse = (selected.salary / daysInMonth) * paidDays;
    } else {
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
  }, [selected, filterType, customStart, customEnd, now]);

  useFocusEffect(
    useCallback(() => {
      loadStaffList();
    }, [])
  );

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectStaff = (s) => {
    setSelected(s);
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    if (type === 'monthly') {
      setCustomStart(now.startOf('month').format('YYYY-MM-DD'));
      setCustomEnd(now.endOf('month').format('YYYY-MM-DD'));
    } else if (type === 'weekly') {
      setCustomStart(now.startOf('week').format('YYYY-MM-DD'));
      setCustomEnd(now.endOf('week').format('YYYY-MM-DD'));
    }
  };

  const markedDates = {};
  attendance.forEach(r => {
    markedDates[r.date] = {
      selected: true,
      selectedColor: r.status === 'P' ? '#D1FAE5' : r.status === 'A' ? '#FEE2E2' : '#FEF3C7',
      selectedTextColor: r.status === 'P' ? '#065F46' : r.status === 'A' ? '#991B1B' : '#92400E',
    };
  });

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
    if (filterType === 'monthly') return now.format('MMMM YYYY');
    if (filterType === 'weekly') return `${now.startOf('week').format('DD MMM')} - ${now.endOf('week').format('DD MMM')}`;
    return `${dayjs(customStart).format('DD MMM')} - ${dayjs(customEnd).format('DD MMM YYYY')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Monthly View</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="filter-outline" size={16} color="#2563EB" />
          <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={16} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {staff.map(s => (
          <TouchableOpacity key={s.id} onPress={() => handleSelectStaff(s)}
            style={[styles.pill, selected?.id === s.id && styles.pillOn]}>
            <View style={[styles.pillAvatar, selected?.id === s.id && styles.pillAvatarOn]}>
              <Text style={[styles.pillAvatarText, selected?.id === s.id && { color: '#fff' }]}>{s.name[0].toUpperCase()}</Text>
            </View>
            <Text style={[styles.pillText, selected?.id === s.id && { color: '#fff' }]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <>
          <View style={styles.legend}>
            {[['#D1FAE5','#065F46','Present'],['#FEE2E2','#991B1B','Absent'],['#FEF3C7','#92400E','Leave']].map(([bg,fg,l]) => (
              <View key={l} style={[styles.legendPill,{backgroundColor:bg}]}>
                <Text style={[styles.legendText,{color:fg}]}>{l}</Text>
              </View>
            ))}
          </View>
          <Calendar markedDates={markedDates} style={styles.calendar}
            current={now.format('YYYY-MM-DD')}
            theme={{ todayTextColor:'#2563EB', arrowColor:'#2563EB', calendarBackground:'#fff'}}/>

          {summary && (
            <View style={styles.summaryCard}>
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
      {staff.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Add staff first from the Staff tab.</Text></View>
      )}

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Period</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptions}>
              {FILTER_TYPES.map(type => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => handleFilterChange(type.key)}
                  style={[styles.filterOption, filterType === type.key && styles.filterOptionActive]}
                >
                  <Ionicons 
                    name={filterType === type.key ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={filterType === type.key ? '#2563EB' : '#6B7280'} 
                  />
                  <Text style={[styles.filterOptionText, filterType === type.key && styles.filterOptionTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filterType === 'custom' && (
              <View style={styles.dateInputs}>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={customStart}
                      onChangeText={setCustomStart}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={customEnd}
                      onChangeText={setCustomEnd}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalApplyBtn} onPress={() => { loadData(); setShowDatePicker(false); }}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.modalApplyText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F3F4F6' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title:       { fontSize: 20, fontWeight: '700', color: '#111827' },
  filterBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  filterBtnText: { fontSize: 13, color: '#2563EB', marginHorizontal: 6 },
  pillRow:     { paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  pill:        { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, marginRight: 12, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  pillOn:      { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillAvatar:  { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pillAvatarOn: { backgroundColor: '#1D4ED8' },
  pillAvatarText: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  pillText:    { fontSize: 12, fontWeight: '500', color: '#374151' },
  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 12 },
  legendPill:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  legendText:  { fontSize: 12, fontWeight: '500' },
  calendar:    { marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryCard: { margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: '600', color: '#111827' },
  filterOptions:{ marginBottom: 20 },
  filterOption:{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F9FAFB', marginBottom: 8 },
  filterOptionActive:{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563EB' },
  filterOptionText:{ fontSize: 15, color: '#6B7280', marginLeft: 12 },
  filterOptionTextActive:{ color: '#2563EB', fontWeight: '500' },
  dateInputs:  { flexDirection: 'row', gap: 12, marginBottom: 20 },
  dateField:   { flex: 1 },
  dateLabel:   { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  inputWrapper:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10 },
  inputIcon:   { marginLeft: 12 },
  input:       { flex: 1, padding: 12, fontSize: 14, color: '#111827' },
  modalApplyBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', padding: 14, borderRadius: 12 },
  modalApplyText:{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },
});