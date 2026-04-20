import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const STATUS_BG = { P: '#D1FAE5', A: '#FEE2E2', L: '#FEF3C7' };
const STATUS_FG = { P: '#065F46', A: '#991B1B', L: '#92400E' };
const STATUS_ICON = {
  P: 'checkmark-circle',
  A: 'close-circle',
  L: 'time-outline',
};

const MonthlyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { staffList, getAttendance } = useApp();

  const [selected, setSelected] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (staffList.length > 0 && !selected) {
        setSelected(staffList[0]);
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

  const handleSelectMonth = (year, month) => {
    setCurrentMonth(new Date(year, month, 1));
    setShowDatePicker(false);
  };

  const calculateSummary = () => {
    if (!selected) return null;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    let present = 0, absent = 0, leave = 0, days = 0;

    const current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() !== 0) {
        days++;
        const dateStr = current.toISOString().split('T')[0];
        const status = getAttendance(selected.id, dateStr);
        if (status === 'P') present++;
        else if (status === 'A') absent++;
        else if (status === 'L') leave++;
      }
      current.setDate(current.getDate() + 1);
    }

    const unmarked = days - present - leave - absent;
    const selectedSalary = parseFloat(selected?.salary || 0);
    const workingDays = endDate.getDate() - startDate.getDate() + 1;
    const salaryPerDay = workingDays > 0 ? selectedSalary / workingDays : 0;
    const grossSalary = (present + leave) * salaryPerDay;

    return {
      daysInMonth: days,
      present,
      leave,
      absent,
      unmarked,
      paidDays: present + leave,
      grossSalary: parseFloat(grossSalary.toFixed(2)),
      totalAdvances: 0,
      netPayable: parseFloat(grossSalary.toFixed(2)),
    };
  };

  const summary = calculateSummary();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

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
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    
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

  const renderDatePicker = () => {
    const years = [];
    const now = new Date();
    for (let y = now.getFullYear(); y >= 2020; y--) {
      years.push(y);
    }

    return (
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.yearList}>
              {years.map(year => (
                <View key={year} style={styles.yearItem}>
                  <Text style={styles.yearText}>{year}</Text>
                  <View style={styles.monthRow}>
                    {monthNames.map((month, index) => (
                      <TouchableOpacity
                        key={month}
                        style={styles.monthItem}
                        onPress={() => handleSelectMonth(year, index)}
                      >
                        <Text style={styles.monthText}>{month.substring(0, 3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
          <Icon name="chevron-back" size={20} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={16} color="#2563EB" />
          <Text style={styles.filterBtnText}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <Icon name="chevron-down" size={16} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
          <Icon name="chevron-forward" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
        {staffList.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => setSelected(s)}
            style={[styles.pill, selected?.id === s.id && styles.pillOn]}
          >
            <View style={[styles.pillAvatar, selected?.id === s.id && styles.pillAvatarOn]}>
              <Text style={[styles.pillAvatarText, selected?.id === s.id && { color: '#fff' }]}>
                {s.name ? s.name[0].toUpperCase() : '?'}
              </Text>
            </View>
            <Text style={[styles.pillText, selected?.id === s.id && { color: '#fff' }]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <>
          <View style={styles.legend}>
            {Object.entries(STATUS_BG).map(([key, color]) => (
              <View key={key} style={[styles.legendPill, { backgroundColor: color }]}>
                <Text style={[styles.legendText, { color: STATUS_FG[key] }]}>
                  {key === 'P' ? 'Present' : key === 'A' ? 'Absent' : 'Leave'}
                </Text>
              </View>
            ))}
            <View style={[styles.legendPill, { backgroundColor: '#E5E7EB' }]}>
              <Text style={[styles.legendText, { color: '#6B7280' }]}>Sunday</Text>
            </View>
          </View>

          <View style={styles.calendarCard}>
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
                <View style={[styles.statBox, { backgroundColor: STATUS_BG.P }]}>
                  <Text style={[styles.statVal, { color: STATUS_FG.P }]}>{summary.present}</Text>
                  <Text style={[styles.statLbl, { color: STATUS_FG.P }]}>Present</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: STATUS_BG.A }]}>
                  <Text style={[styles.statVal, { color: STATUS_FG.A }]}>{summary.absent}</Text>
                  <Text style={[styles.statLbl, { color: STATUS_FG.A }]}>Absent</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: STATUS_BG.L }]}>
                  <Text style={[styles.statVal, { color: STATUS_FG.L }]}>{summary.leave}</Text>
                  <Text style={[styles.statLbl, { color: STATUS_FG.L }]}>Leave</Text>
                </View>
              </View>
              <View style={styles.breakdown}>
                <View style={styles.bRow}>
                  <Text style={styles.bLabel}>Gross salary</Text>
                  <Text style={styles.bValue}>₹{summary.grossSalary}</Text>
                </View>
                <View style={styles.bRow}>
                  <Text style={styles.bLabel}>Advances</Text>
                  <Text style={[styles.bValue, { color: '#DC2626' }]}>- ₹{summary.totalAdvances}</Text>
                </View>
                <View style={[styles.bRow, styles.bTotalRow]}>
                  <Text style={styles.bTotalLabel}>Net payable</Text>
                  <Text style={styles.bTotalValue}>₹{summary.netPayable}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.shareBtn}>
                <Icon name="share-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share Payslip</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {staffList.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add staff first from the Staff tab.</Text>
        </View>
      )}

      {renderDatePicker()}
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
  navBtn: { padding: 8 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  filterBtnText: { fontSize: 14, color: '#2563EB', marginHorizontal: 8, fontWeight: '600' },
  pillRow: {
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pill: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  pillAvatarOn: { backgroundColor: '#1D4ED8' },
  pillAvatarText: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  pillText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    flexWrap: 'wrap',
  },
  legendPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  legendText: { fontSize: 11, fontWeight: '500' },
  calendarCard: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8,
    borderRadius: 16, padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8,
  },
  calendarHeaderText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  calendarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  calendarEmptyDay: { width: `${100 / 7}%`, aspectRatio: 1 },
  calendarDay: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  calendarDayFuture: { opacity: 0.4 },
  calendarDaySunday: { backgroundColor: '#E5E7EB', borderRadius: 8 },
  calendarDayText: { fontSize: 12, color: '#374151' },
  calendarDayTextFuture: { color: '#9CA3AF' },
  summaryCard: {
    margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '700' },
  statLbl: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  breakdown: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bLabel: { fontSize: 13, color: '#6B7280' },
  bValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  bTotalRow: {
    borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4, marginBottom: 0,
  },
  bTotalLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  bTotalValue: { fontSize: 18, fontWeight: '700', color: '#059669' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#25D366', padding: 14, borderRadius: 12,
  },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 15, marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  datePickerModal: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%', maxHeight: '80%', overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  datePickerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  yearList: { maxHeight: 400 },
  yearItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  yearText: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  monthItem: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6', borderRadius: 8 },
  monthText: { fontSize: 12, color: '#374151' },
});

export default MonthlyScreen;