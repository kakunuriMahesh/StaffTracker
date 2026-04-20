import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const FILTER_TYPES = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'custom', label: 'Custom' },
];

const STATUS_BG = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const STATUS_FG = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const STATUS_ICON = {
  P: 'checkmark-circle',
  A: 'close-circle',
  L: 'time-outline',
};

const MonthlyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { staffList, getAttendance, getStaffNotes } = useApp();

  const [selected, setSelected] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState('monthly');
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  useFocusEffect(
    useCallback(() => {
      if (staffList.length > 0 && !selected) {
        setSelected(staffList[0]);
      } else if (staffList.length > 0 && selected) {
        const exists = staffList.find(s => s.id === selected.id);
        if (!exists) setSelected(staffList[0]);
      }
    }, [staffList])
  );

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

  const handleFilterChange = (type) => {
    setFilterType(type);
    const now = new Date();
    if (type === 'monthly') {
      setCustomStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setCustomEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    } else if (type === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      setCustomStart(startOfWeek.toISOString().split('T')[0]);
      setCustomEnd(endOfWeek.toISOString().split('T')[0]);
    }
  };

  const calculateSummary = () => {
    if (!selected) return null;

    let startDate, endDate;
    const now = new Date();
    const current = new Date(currentMonth);

    if (filterType === 'monthly') {
      startDate = new Date(current.getFullYear(), current.getMonth(), 1);
      endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    } else if (filterType === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      startDate = startOfWeek;
      endDate = endOfWeek;
    } else {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    }

    let present = 0, absent = 0, leave = 0, days = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (currentDate <= now) {
        days++;
        const dateStr = currentDate.toISOString().split('T')[0];
        const status = getAttendance(selected.id, dateStr);
        if (status === 'P') present++;
        else if (status === 'A') absent++;
        else if (status === 'L') leave++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const unmarked = days - present - leave - absent;
    const selectedSalary = parseFloat(selected?.salary || 0);
    const staffSalaryType = selected?.salary_type || 'monthly';
    
    let paidDays, salaryToUse;
    const daysInPeriod = days;
    
    if (staffSalaryType === 'daily') {
      paidDays = present;
      salaryToUse = present * selectedSalary;
    } else if (staffSalaryType === 'weekly') {
      paidDays = present + leave;
      const weeklyDays = 7;
      salaryToUse = (selectedSalary / weeklyDays) * paidDays;
    } else {
      paidDays = present + leave;
      salaryToUse = (selectedSalary / daysInPeriod) * paidDays;
    }

    return {
      daysInPeriod,
      present,
      leave,
      absent,
      unmarked,
      paidDays,
      grossSalary: parseFloat(salaryToUse.toFixed(2)),
      totalAdvances: 0,
      netPayable: parseFloat(salaryToUse.toFixed(2)),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const summary = calculateSummary();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const getAttendanceForPeriod = () => {
    if (!selected) return [];
    
    let startDate, endDate;
    const now = new Date();
    const current = new Date(currentMonth);

    if (filterType === 'monthly') {
      startDate = new Date(current.getFullYear(), current.getMonth(), 1);
      endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    } else if (filterType === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    }

    const attendanceData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (currentDate <= now) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const status = getAttendance(selected.id, dateStr);
        if (status) {
          attendanceData.push({ date: dateStr, status });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return attendanceData;
  };

  const attendanceForPeriod = getAttendanceForPeriod();

  const generateCalendarDays = () => {
    if (!selected) return [];
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarEmptyDay} />);
    }
    
    const now = new Date();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const status = getAttendance(selected.id, dateStr);
      const dayDate = new Date(year, month, i);
      const isSunday = dayDate.getDay() === 0;
      const isFuture = dayDate > now;
      
      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.calendarDay,
            status && { backgroundColor: STATUS_BG[status] },
            isFuture && styles.calendarDayFuture,
            isSunday && styles.calendarDaySunday,
          ]}
          disabled={isFuture}
        >
          <Text style={[
            styles.calendarDayText,
            status && { color: STATUS_FG[status] },
            isFuture && styles.calendarDayTextFuture,
          ]}>
            {i}
          </Text>
          {status && (
            <Icon name={STATUS_ICON[status]} size={12} color={STATUS_FG[status]} />
          )}
        </TouchableOpacity>
      );
    }
    return days;
  };

  const handleSharePayslip = async () => {
    if (!selected || !summary) return;
    
    const formatDate = (dateStr) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const message = `
🧾 Salary Slip - ${selected.name}

📅 Period: ${formatDate(summary.startDate)} - ${formatDate(summary.endDate)}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ATTENDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━
Present: ${summary.present} days
Absent:  ${summary.absent} days
Leave:   ${summary.leave} days
Working: ${summary.daysInPeriod} days

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 SALARY BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━
Base Salary: ₹${selected.salary} / ${selected.salary_type === 'daily' ? 'day' : 'month'}
Paid Days:  ${summary.paidDays}
Gross:      ₹${summary.grossSalary}
Advances:   -₹${summary.totalAdvances}

★ Net Payable: ₹${summary.netPayable}
━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated by StaffTracker
    `.trim();

    try {
      await Share.share({
        message,
        title: `Salary Slip - ${selected.name}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const getFilterLabel = () => {
    const now = new Date();
    if (filterType === 'monthly') return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (filterType === 'weekly') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return `${new Date(customStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(customEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatCustomDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Icon name="filter" size={16} color="#2563EB" />
          <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
          <Icon name="chevron-down" size={16} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.pillRow}
        contentContainerStyle={styles.pillRowContent}
      >
        {staffList.map(s => (
          <TouchableOpacity key={s.id} onPress={() => setSelected(s)}
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

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                <Icon name="chevron-back" size={20} color="#2563EB" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                <Icon name="chevron-forward" size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarHeaderText}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {generateCalendarDays()}
            </View>
          </View>

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
              <TouchableOpacity style={styles.shareBtn} onPress={handleSharePayslip}>
                <Icon name="share-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share Payslip</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {staffList.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Add staff first from the Staff tab.</Text></View>
      )}

      <Modal visible={showFilterModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Period</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptions}>
              {FILTER_TYPES.map(type => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => handleFilterChange(type.key)}
                  style={[styles.filterOption, filterType === type.key && styles.filterOptionActive]}
                >
                  <Icon 
                    name={filterType === type.key ? 'radio-button-on' : 'ellipse-outline'} 
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
                  <TouchableOpacity 
                    style={styles.datePickerBtn}
                    onPress={() => {}}
                  >
                    <Icon name="calendar" size={18} color="#6B7280" />
                    <Text style={styles.dateText}>{formatCustomDate(customStart)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity 
                    style={styles.datePickerBtn}
                    onPress={() => {}}
                  >
                    <Icon name="calendar" size={18} color="#6B7280" />
                    <Text style={styles.dateText}>{formatCustomDate(customEnd)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilterModal(false)}>
              <Icon name="checkmark" size={18} color="#fff" />
              <Text style={styles.modalApplyText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  filterBtnText: { fontSize: 14, color: '#2563EB', marginHorizontal: 8, fontWeight: '600' },
  pillRow: { minHeight: 70, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  pillRowContent: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 70 },
  pill: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, marginRight: 12, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', minWidth: 80 },
  pillOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pillAvatarOn: { backgroundColor: '#1D4ED8' },
  pillAvatarText: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  pillText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 12 },
  legendPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  legendText: { fontSize: 12, fontWeight: '500' },
  calendarCard: { marginHorizontal: 12, marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', padding: 12 },
  calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthNavBtn: { padding: 8 },
  monthTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calendarHeaderText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  calendarEmptyDay: { width: '14.28%', height: 40 },
  calendarDay: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calendarDayFuture: { opacity: 0.4 },
  calendarDaySunday: { backgroundColor: '#E5E7EB' },
  calendarDayText: { fontSize: 12, color: '#374151' },
  calendarDayTextFuture: { color: '#9CA3AF' },
  summaryCard: { margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 120 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '700' },
  statLbl: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  breakdown: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bLabel: { fontSize: 13, color: '#6B7280' },
  bValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  bTotalRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4, marginBottom: 0 },
  bTotalLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  bTotalValue: { fontSize: 18, fontWeight: '700', color: '#059669' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', padding: 14, borderRadius: 12 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 15, marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 0 },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  filterOptions: { marginBottom: 20 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F9FAFB', marginBottom: 8 },
  filterOptionActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563EB' },
  filterOptionText: { fontSize: 15, color: '#6B7280', marginLeft: 12 },
  filterOptionTextActive: { color: '#2563EB', fontWeight: '500' },
  dateInputs: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateText: { fontSize: 14, color: '#1E293B', marginLeft: 10 },
  modalApplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', padding: 14, borderRadius: 12 },
  modalApplyText: { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },
});

export default MonthlyScreen;