import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { addStaff } from '../database/db';
import { Calendar } from 'react-native-calendars';

const ROLES = ['Maid', 'Cook', 'Driver', 'Gardener', 'Security', 'Watchman', 'Other'];
const DURATION_TYPES = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'manual', label: 'Manual' },
];

export default function AddStaffScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('Maid');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [joinDate, setJoinDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [salaryType, setSalaryType] = useState('monthly');
  const [salaryStartDate, setSalaryStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [salaryEndDate, setSalaryEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('join');
  const [errors, setErrors] = useState({});

  const handlePhoneChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setPhone(numericValue);
  };

  const openDatePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDateSelect = (day) => {
    const selectedDate = day.dateString;
    if (datePickerMode === 'join') {
      setJoinDate(selectedDate);
      setErrors((prev) => ({ ...prev, joinDate: null }));
    } else if (datePickerMode === 'start') {
      setSalaryStartDate(selectedDate);
      setErrors((prev) => ({ ...prev, salaryStartDate: null }));
      if (salaryEndDate && dayjs(selectedDate).isAfter(dayjs(salaryEndDate))) {
        setSalaryEndDate(selectedDate);
      }
    } else if (datePickerMode === 'end') {
      setSalaryEndDate(selectedDate);
      setErrors((prev) => ({ ...prev, salaryEndDate: null }));
    }
    setShowDatePicker(false);
  };

  const getCalendarTheme = () => ({
    backgroundColor: '#ffffff',
    calendarBackground: '#ffffff',
    textSectionTitleColor: '#6B7280',
    selectedDayBackgroundColor: '#2563EB',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#2563EB',
    dayTextColor: '#374151',
    textDisabledColor: '#D1D5DB',
    arrowColor: '#2563EB',
    monthTextColor: '#111827',
    textDayFontWeight: '500',
    textMonthFontWeight: '600',
    textDayHeaderFontWeight: '500',
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 12,
  });

  const getMarkedDates = () => {
    const marked = {};
    if (datePickerMode === 'start' && salaryEndDate) {
      marked[salaryEndDate] = { disabled: true, disableTouchEvent: true };
    }
    if (datePickerMode === 'end' && salaryStartDate) {
      const start = dayjs(salaryStartDate);
      const end = dayjs(salaryEndDate);
      const today = dayjs().endOf('day');
      for (let d = start; d.isBefore(today); d = d.add(1, 'day')) {
        if (d.isBefore(start)) continue;
        marked[d.format('YYYY-MM-DD')] = { disabled: true, disableTouchEvent: true };
      }
    }
    return marked;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Please enter staff name';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Please enter phone number';
    } else if (phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }
    
    if (!salary.trim()) {
      newErrors.salary = 'Please enter salary amount';
    } else if (isNaN(parseFloat(salary)) || parseFloat(salary) <= 0) {
      newErrors.salary = 'Please enter a valid salary amount';
    }
    
    if (!joinDate) {
      newErrors.joinDate = 'Please select joining date';
    }
    
    if (salaryType === 'manual') {
      if (!salaryStartDate) {
        newErrors.salaryStartDate = 'Please select start date';
      }
      if (!salaryEndDate) {
        newErrors.salaryEndDate = 'Please select end date';
      }
      if (salaryStartDate && salaryEndDate) {
        if (dayjs(salaryEndDate).isBefore(dayjs(salaryStartDate))) {
          newErrors.salaryEndDate = 'End date cannot be before start date';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async () => {
    if (!validateForm()) {
      const errorList = Object.values(errors).filter(Boolean);
      if (errorList.length > 0) {
        Alert.alert('Validation Error', errorList[0]);
      }
      return;
    }

    try {
      await addStaff(name.trim(), position, parseFloat(salary), phone, joinDate, salaryType, salaryStartDate, salaryEndDate);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving staff:', error);
      Alert.alert('Error', 'Failed to save staff. Please try again.');
    }
  };

  const getSalaryLabel = () => {
    switch (salaryType) {
      case 'weekly': return 'Weekly Salary (₹)';
      case 'monthly': return 'Monthly Salary (₹)';
      case 'manual': return 'Salary for Period (₹)';
      default: return 'Salary (₹)';
    }
  };

  const getDatePickerTitle = () => {
    switch (datePickerMode) {
      case 'join': return 'Select Joining Date';
      case 'start': return 'Select Start Date';
      case 'end': return 'Select End Date';
      default: return 'Select Date';
    }
  };

  const getMinDate = () => {
    if (datePickerMode === 'join') return undefined;
    if (datePickerMode === 'end' && salaryStartDate) {
      return salaryStartDate;
    }
    return undefined;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
            <Ionicons name="person" size={20} color={errors.name ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={(text) => { setName(text); setErrors((prev) => ({ ...prev, name: null })); }} 
              placeholder="Enter full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Role</Text>
          <View style={styles.roleContainer}>
            {ROLES.map((r, index) => (
              <TouchableOpacity 
                key={r} 
                onPress={() => setPosition(r)}
                style={[
                  styles.roleChip, 
                  position === r && styles.roleChipActive,
                  index === ROLES.length - 1 && styles.roleChipLast
                ]}
              >
                <Ionicons 
                  name={position === r ? 'radio-button-on' : 'radio-button-off'} 
                  size={16} 
                  color={position === r ? '#fff' : '#9CA3AF'} 
                />
                <Text style={[styles.roleText, position === r && styles.roleTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
            <Ionicons name="call" size={20} color={errors.phone ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={phone} 
              onChangeText={handlePhoneChange}
              keyboardType="numeric"
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              maxLength={15}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Joining Date</Text>
          <TouchableOpacity 
            style={[styles.inputWrapper, styles.dateWrapper, errors.joinDate && styles.inputError]}
            onPress={() => openDatePicker('join')}
          >
            <Ionicons name="calendar" size={20} color={errors.joinDate ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
            <Text style={[styles.dateText, !joinDate && styles.placeholderText]}>
              {joinDate ? dayjs(joinDate).format('DD MMMM YYYY') : 'Select joining date'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          {errors.joinDate && <Text style={styles.errorText}>{errors.joinDate}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Salary Duration</Text>
          <View style={styles.durationContainer}>
            {DURATION_TYPES.map(type => (
              <TouchableOpacity
                key={type.key}
                onPress={() => {
                  setSalaryType(type.key);
                  if (type.key === 'monthly') {
                    setSalaryStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
                    setSalaryEndDate(dayjs().endOf('month').format('YYYY-MM-DD'));
                  } else if (type.key === 'weekly') {
                    setSalaryStartDate('');
                    setSalaryEndDate('');
                  }
                }}
                style={[styles.durationBtn, salaryType === type.key && styles.durationBtnActive]}
              >
                <Ionicons 
                  name={salaryType === type.key ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={18} 
                  color={salaryType === type.key ? '#2563EB' : '#9CA3AF'} 
                />
                <Text style={[styles.durationText, salaryType === type.key && styles.durationTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {salaryType === 'manual' && (
          <View style={[styles.dateRangeContainer, styles.cardStyle]}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <TouchableOpacity 
                style={[styles.inputWrapper, styles.dateWrapper, errors.salaryStartDate && styles.inputError]}
                onPress={() => openDatePicker('start')}
              >
                <Ionicons name="calendar" size={18} color={errors.salaryStartDate ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
                <Text style={[styles.dateText, !salaryStartDate && styles.placeholderText]}>
                  {salaryStartDate ? dayjs(salaryStartDate).format('DD MMM YYYY') : 'Start date'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              {errors.salaryStartDate && <Text style={styles.errorText}>{errors.salaryStartDate}</Text>}
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TouchableOpacity 
                style={[styles.inputWrapper, styles.dateWrapper, errors.salaryEndDate && styles.inputError]}
                onPress={() => openDatePicker('end')}
              >
                <Ionicons name="calendar" size={18} color={errors.salaryEndDate ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
                <Text style={[styles.dateText, !salaryEndDate && styles.placeholderText]}>
                  {salaryEndDate ? dayjs(salaryEndDate).format('DD MMM YYYY') : 'End date'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              {errors.salaryEndDate && <Text style={styles.errorText}>{errors.salaryEndDate}</Text>}
            </View>
          </View>
        )}

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>{getSalaryLabel()}</Text>
          <View style={[styles.inputWrapper, errors.salary && styles.inputError]}>
            <Ionicons name="wallet" size={20} color={errors.salary ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput 
              style={[styles.input, styles.salaryInput]} 
              value={salary} 
              onChangeText={(text) => { setSalary(text); setErrors((prev) => ({ ...prev, salary: null })); }}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {errors.salary && <Text style={styles.errorText}>{errors.salary}</Text>}
          {salaryType !== 'manual' && salary.length > 0 && !errors.salary && (
            <Text style={styles.salaryHint}>₹{parseFloat(salary || 0).toLocaleString('en-IN')} {salaryType === 'weekly' ? 'per week' : 'per month'}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Save Staff</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDatePicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>{getDatePickerTitle()}</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Calendar
              current={dayjs().format('YYYY-MM-DD')}
              onDayPress={handleDateSelect}
              markedDates={{
                ...getMarkedDates(),
                [datePickerMode === 'join' ? joinDate : datePickerMode === 'start' ? salaryStartDate : salaryEndDate]: {
                  selected: true,
                  selectedColor: '#2563EB',
                }
              }}
              minDate={getMinDate()}
              theme={getCalendarTheme()}
              style={styles.calendar}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  form: { padding: 16, paddingBottom: 40 },
  cardStyle: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0',
  },
  inputWrapperFocused: { borderColor: '#2563EB' },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#1E293B' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 6, marginLeft: 4 },
  dateWrapper: { paddingRight: 12, minHeight: 52 },
  dateText: { flex: 1, fontSize: 15, color: '#1E293B', paddingVertical: 14 },
  placeholderText: { color: '#9CA3AF' },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  roleChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 10, 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0',
    marginRight: 8,
    marginBottom: 8,
  },
  roleChipLast: { marginRight: 0 },
  roleChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  roleText: { fontSize: 13, fontWeight: '500', color: '#64748B', marginLeft: 6 },
  roleTextActive: { color: '#fff' },
  durationContainer: { flexDirection: 'row', gap: 8 },
  durationBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 12, 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0',
  },
  durationBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  durationText: { fontSize: 13, fontWeight: '600', color: '#64748B', marginLeft: 8 },
  durationTextActive: { color: '#2563EB' },
  dateRangeContainer: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: '#059669', marginLeft: 8, marginRight: 2 },
  salaryInput: { paddingLeft: 0 },
  salaryHint: { fontSize: 13, color: '#059669', marginTop: 10, fontWeight: '500' },
  saveBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#2563EB', 
    padding: 16, 
    borderRadius: 14, 
    marginTop: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  calendarModal: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  calendarTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  closeBtn: { padding: 4 },
  calendar: { borderRadius: 20 },
});
