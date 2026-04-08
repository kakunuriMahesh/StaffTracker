import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getStaffById, updateStaff } from '../database/db';

const ROLES = ['Maid', 'Cook', 'Driver', 'Gardener', 'Security', 'Watchman', 'Other'];
const DURATION_TYPES = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'manual', label: 'Manual' },
];

export default function EditStaffScreen({ route, navigation }) {
  const { staffId } = route.params;
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('Maid');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [salaryStartDate, setSalaryStartDate] = useState('');
  const [salaryEndDate, setSalaryEndDate] = useState('');

  useEffect(() => {
    const loadStaff = async () => {
      const s = await getStaffById(staffId);
      if (s) {
        setName(s.name);
        setPosition(s.position);
        setPhone(s.phone || '');
        setSalary(String(s.salary));
        setJoinDate(s.join_date || '');
        setSalaryType(s.salary_type || 'monthly');
        setSalaryStartDate(s.salary_start_date || '');
        setSalaryEndDate(s.salary_end_date || '');
      }
    };
    loadStaff();
  }, [staffId]);

  const save = async () => {
    if (!name.trim() || !salary.trim()) { Alert.alert('Missing', 'Name and salary are required.'); return; }
    if (salaryType === 'manual' && (!salaryStartDate || !salaryEndDate)) {
      Alert.alert('Missing', 'Please select start and end dates for manual duration.'); return;
    }
    await updateStaff(staffId, name.trim(), position, parseFloat(salary), phone, salaryType, salaryStartDate || null, salaryEndDate || null);
    navigation.goBack();
  };

  const getSalaryLabel = () => {
    switch (salaryType) {
      case 'weekly': return 'Weekly salary (₹)';
      case 'monthly': return 'Monthly salary (₹)';
      case 'manual': return 'Salary for period (₹)';
      default: return 'Salary (₹)';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter full name" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Role</Text>
          <View style={styles.roleContainer}>
            {ROLES.map(r => (
              <TouchableOpacity key={r} onPress={() => setPosition(r)} style={[styles.roleChip, position === r && styles.roleChipActive]}>
                <Ionicons name={position === r ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={position === r ? '#fff' : '#6B7280'} style={{ marginRight: 4 }} />
                <Text style={[styles.roleText, position === r && styles.roleTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Enter phone number" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.inputGroup}>
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
                <Ionicons name={salaryType === type.key ? 'radio-button-on' : 'radio-button-off'} size={18} color={salaryType === type.key ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.durationText, salaryType === type.key && styles.durationTextActive]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {salaryType === 'manual' && (
          <View style={styles.dateRangeContainer}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput style={styles.input} value={salaryStartDate} onChangeText={setSalaryStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End Date</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput style={styles.input} value={salaryEndDate} onChangeText={setSalaryEndDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{getSalaryLabel()}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="wallet-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput style={styles.input} value={salary} onChangeText={setSalary} keyboardType="numeric" placeholder="Enter amount" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Join Date</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inputIcon} />
            <TextInput style={styles.input} value={joinDate} onChangeText={setJoinDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Update Staff</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  form: { padding: 20, paddingBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#111827' },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  roleChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  roleText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  roleTextActive: { color: '#fff' },
  durationContainer: { flexDirection: 'row', gap: 12 },
  durationBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  durationBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  durationText: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginLeft: 6 },
  durationTextActive: { color: '#2563EB' },
  dateRangeContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', padding: 16, borderRadius: 12, marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});