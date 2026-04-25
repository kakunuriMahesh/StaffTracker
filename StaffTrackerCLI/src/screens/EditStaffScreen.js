import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

const DEFAULT_ROLES = ['Maid', 'Cook', 'Driver', 'Gardener', 'Security', 'Watchman', 'Other'];
const DURATION_TYPES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const EditStaffScreen = ({ route, navigation }) => {
  const { staffId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { staffList, updateStaff, isStaffLocked, canEditStaff } = useApp();

  const staff = staffList.find((s) => s.id === staffId);

  const [name, setName] = useState(staff?.name || '');
  const [position, setPosition] = useState(staff?.position || 'Maid');
  const [phone, setPhone] = useState(staff?.phone || '');
  const [salary, setSalary] = useState(String(staff?.salary || ''));
  const [salaryType, setSalaryType] = useState(staff?.salary_type || 'monthly');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [errors, setErrors] = useState({});

  const isLocked = staff ? isStaffLocked(staff) : false;
  const canEdit = staff ? canEditStaff(staff) : true;

  useEffect(() => {
    if (staff) {
      setName(staff.name || '');
      setPosition(staff.position || 'Maid');
      setPhone(staff.phone || '');
      setSalary(String(staff.salary || ''));
      setSalaryType(staff.salary_type || 'monthly');
    }
  }, [staff]);

  const handlePhoneChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setPhone(numericValue);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter staff name';
    }

    if (phone.trim() && phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }

    if (!salary.trim()) {
      newErrors.salary = 'Please enter salary amount';
    } else if (isNaN(parseFloat(salary)) || parseFloat(salary) <= 0) {
      newErrors.salary = 'Please enter a valid salary amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!canEdit) {
      Alert.alert('Locked', 'This staff member is locked due to plan expiry.');
      return;
    }

    if (!validateForm()) {
      const errorList = Object.values(errors).filter(Boolean);
      if (errorList.length > 0) {
        Alert.alert('Validation Error', errorList[0]);
      }
      return;
    }

    try {
      await updateStaff(staffId, {
        name: name.trim(),
        position,
        phone: phone.trim(),
        salary: parseFloat(salary),
        salary_type: salaryType,
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error updating staff:', error);
      Alert.alert('Error', 'Failed to update staff. Please try again.');
    }
  };

  if (!staff) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Staff not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
            <Icon
              name="person"
              size={20}
              color={errors.name ? '#EF4444' : '#6B7280'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="Enter full name"
              placeholderTextColor="#9CA3AF"
              editable={canEdit}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Role</Text>
          <TouchableOpacity
            style={[styles.roleDropdown, errors.position && styles.inputError]}
            onPress={() => canEdit && setShowRoleDropdown(!showRoleDropdown)}
          >
            <View style={styles.roleDropdownContent}>
              <Icon
                name="briefcase"
                size={20}
                color="#6B7280"
                style={styles.inputIcon}
              />
              <Text style={styles.roleDropdownText}>{position}</Text>
            </View>
            <Icon
              name={showRoleDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
          {showRoleDropdown && canEdit && (
            <View style={styles.dropdownContainer}>
              {DEFAULT_ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.dropdownItem,
                    position === role && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setPosition(role);
                    setShowRoleDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      position === role && styles.dropdownItemTextActive,
                    ]}
                  >
                    {role}
                  </Text>
                  {position === role && (
                    <Icon name="checkmark" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
            <Icon
              name="call"
              size={20}
              color={errors.phone ? '#EF4444' : '#6B7280'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="numeric"
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              maxLength={15}
              editable={canEdit}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Salary Duration</Text>
          <View style={styles.durationContainer}>
            {DURATION_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                onPress={() => canEdit && setSalaryType(type.key)}
                style={[
                  styles.durationBtn,
                  salaryType === type.key && styles.durationBtnActive,
                ]}
                disabled={!canEdit}
              >
                <Icon
                  name={
                    salaryType === type.key
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={18}
                  color={salaryType === type.key ? '#2563EB' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.durationText,
                    salaryType === type.key && styles.durationTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>
            {salaryType === 'daily' ? 'Daily Wage (₹)' : 'Monthly Salary (₹)'}
          </Text>
          <View
            style={[styles.inputWrapper, errors.salary && styles.inputError]}
          >
            <Icon
              name="wallet"
              size={20}
              color={errors.salary ? '#EF4444' : '#6B7280'}
              style={styles.inputIcon}
            />
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={[styles.input, styles.salaryInput]}
              value={salary}
              onChangeText={(text) => {
                setSalary(text);
                setErrors((prev) => ({ ...prev, salary: null }));
              }}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              editable={canEdit}
            />
          </View>
          {errors.salary && (
            <Text style={styles.errorText}>{errors.salary}</Text>
          )}
          {salary.length > 0 && !errors.salary && (
            <Text style={styles.salaryHint}>
              ₹{parseFloat(salary || 0).toLocaleString('en-IN')}{' '}
              {salaryType === 'daily' ? 'per day' : 'per month'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !canEdit && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canEdit}
        >
          <Icon name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Update Staff</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1 },
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
  form: { padding: 16, paddingBottom: 40 },
  cardStyle: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputGroup: { marginBottom: 4 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  roleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  roleDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleDropdownText: { fontSize: 15, color: '#1E293B', flex: 1 },
  dropdownContainer: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 15, color: '#374151' },
  dropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
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
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveBtnDisabled: { opacity: 0.7 },
});

export default EditStaffScreen;