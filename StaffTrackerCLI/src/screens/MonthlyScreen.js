import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const MonthlyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { staffList, isStaffLocked, getAttendance } = useApp();

  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState('monthly');

  useFocusEffect(
    useCallback(() => {
      if (staffList.length > 0 && !selected) {
        setSelected(staffList[0]);
      }
    }, [staffList])
  );

  const calculateSummary = () => {
    if (!selected) return null;

    const now = new Date();
    let startDate, endDate;

    if (filterType === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filterType === 'weekly') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      endDate = new Date(now);
      endDate.setDate(now.getDate() + (6 - day));
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    }

    let present = 0,
      absent = 0,
      leave = 0,
      days = 0;

    const current = new Date(startDate);
    while (current <= endDate) {
      days++;
      const dateStr = current.toISOString().split('T')[0];
      const status = getAttendance(selected.id, dateStr);
      if (status === 'P') present++;
      else if (status === 'A') absent++;
      else if (status === 'L') leave++;
      current.setDate(current.getDate() + 1);
    }

    const unmarked = days - present - leave - absent;
    const selectedSalary = parseFloat(selected?.salary || 0);
    const salaryPerDay = days > 0 ? selectedSalary / days : 0;
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
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const summary = calculateSummary();

  const handleSelectStaff = (s) => {
    setSelected(s);
  };

  const getFilterLabel = () => {
    const now = new Date();
    if (filterType === 'monthly') {
      return now.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (filterType === 'weekly') {
      return 'This Week';
    }
    return 'Custom';
  };

  const markedDates = {};
  if (selected) {
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const status = getAttendance(selected.id, dateStr);
      if (status) {
        markedDates[dateStr] = {
          selected: true,
          selectedColor:
            status === 'P'
              ? '#D1FAE5'
              : status === 'A'
              ? '#FEE2E2'
              : '#FEF3C7',
          selectedTextColor:
            status === 'P'
              ? '#065F46'
              : status === 'A'
              ? '#991B1B'
              : '#92400E',
        };
      }
    }
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => handleSelectStaff(item)}
      style={[
        styles.pill,
        selected?.id === item.id && styles.pillOn,
      ]}
    >
      <View
        style={[
          styles.pillAvatar,
          selected?.id === item.id && styles.pillAvatarOn,
        ]}
      >
        <Text
          style={[
            styles.pillAvatarText,
            selected?.id === item.id && { color: '#fff' },
          ]}
        >
          {item.name ? item.name[0].toUpperCase() : '?'}
        </Text>
      </View>
      <Text
        style={[
          styles.pillText,
          selected?.id === item.id && { color: '#fff' },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {}}
        >
          <Icon name="filter" size={16} color="#2563EB" />
          <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
          <Icon name="chevron-down" size={16} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillRow}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {staffList.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => handleSelectStaff(s)}
            style={[
              styles.pill,
              selected?.id === s.id && styles.pillOn,
            ]}
          >
            <View
              style={[
                styles.pillAvatar,
                selected?.id === s.id && styles.pillAvatarOn,
              ]}
            >
              <Text
                style={[
                  styles.pillAvatarText,
                  selected?.id === s.id && { color: '#fff' },
                ]}
              >
                {s.name ? s.name[0].toUpperCase() : '?'}
              </Text>
            </View>
            <Text
              style={[
                styles.pillText,
                selected?.id === s.id && { color: '#fff' },
              ]}
            >
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && summary && (
        <>
          <View style={styles.legend}>
            <View style={[styles.legendPill, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.legendText, { color: '#065F46' }]}>
                Present
              </Text>
            </View>
            <View style={[styles.legendPill, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.legendText, { color: '#991B1B' }]}>
                Absent
              </Text>
            </View>
            <View style={[styles.legendPill, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.legendText, { color: '#92400E' }]}>
                Leave
              </Text>
            </View>
          </View>

          {summary && (
            <View style={styles.summaryCard}>
              <View style={styles.statsRow}>
                <View
                  style={[styles.statBox, { backgroundColor: '#D1FAE5' }]}
                >
                  <Text style={[styles.statVal, { color: '#065F46' }]}>
                    {summary.present}
                  </Text>
                  <Text style={[styles.statLbl, { color: '#065F46' }]}>
                    Present
                  </Text>
                </View>
                <View
                  style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}
                >
                  <Text style={[styles.statVal, { color: '#991B1B' }]}>
                    {summary.absent}
                  </Text>
                  <Text style={[styles.statLbl, { color: '#991B1B' }]}>
                    Absent
                  </Text>
                </View>
                <View
                  style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}
                >
                  <Text style={[styles.statVal, { color: '#92400E' }]}>
                    {summary.leave}
                  </Text>
                  <Text style={[styles.statLbl, { color: '#92400E' }]}>
                    Leave
                  </Text>
                </View>
              </View>
              <View style={styles.breakdown}>
                <View style={styles.bRow}>
                  <Text style={styles.bLabel}>Gross salary</Text>
                  <Text style={styles.bValue}>₹{summary.grossSalary}</Text>
                </View>
                <View style={styles.bRow}>
                  <Text style={styles.bLabel}>Advances</Text>
                  <Text style={[styles.bValue, { color: '#DC2626' }]}>
                    - ₹{summary.totalAdvances}
                  </Text>
                </View>
                <View style={[styles.bRow, styles.bTotalRow]}>
                  <Text style={styles.bTotalLabel}>Net payable</Text>
                  <Text style={styles.bTotalValue}>₹{summary.netPayable}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={() => {}}>
                <Icon name="share-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share Payslip</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      {staffList.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Add staff first from the Staff tab.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pillAvatarOn: { backgroundColor: '#1D4ED8' },
  pillAvatarText: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  pillText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
  },
  legendPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  legendText: { fontSize: 12, fontWeight: '500' },
  summaryCard: {
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '700' },
  statLbl: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  breakdown: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bLabel: { fontSize: 13, color: '#6B7280' },
  bValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  bTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  bTotalLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  bTotalValue: { fontSize: 18, fontWeight: '700', color: '#059669' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    padding: 14,
    borderRadius: 12,
  },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 15, marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});

export default MonthlyScreen;