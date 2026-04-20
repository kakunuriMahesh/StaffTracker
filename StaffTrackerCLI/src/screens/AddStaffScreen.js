import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { storageService } from '../services/storageService';

const DEFAULT_ROLES = ['Maid', 'Cook', 'Driver', 'Gardener', 'Security', 'Watchman', 'Other'];
const DURATION_TYPES = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
];
const QUICK_SELECT_AMOUNTS = [500, 1000, 2000, 5000];

const AddStaffScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { addStaff, isPremium, getMaxStaffCount, staffList } = useApp();

  const [name, setName] = useState('');
  const [position, setPosition] = useState('Maid');
  const [customRole, setCustomRole] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([...DEFAULT_ROLES]);
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [currentSalary, setCurrentSalary] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCustomRoles();
  }, []);

  const loadCustomRoles = async () => {
    try {
      const savedRoles = await storageService.getCustomRoles();
      if (savedRoles && savedRoles.length > 0) {
        const customRolesList = savedRoles.filter(r => !DEFAULT_ROLES.includes(r));
        setAvailableRoles([...DEFAULT_ROLES, ...customRolesList]);
      }
    } catch (error) {
      console.log('Error loading custom roles:', error);
    }
  };

  const handlePhoneChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setPhone(numericValue);
  };

  const handleSalaryChange = (text) => {
    setSalary(text);
    setCurrentSalary(text);
  };

  const handleSelectQuickAmount = (amount) => {
    setSalary(String(amount));
    setCurrentSalary(String(amount));
  };

  const handleAddNewRole = () => {
    if (!customRole.trim()) {
      Alert.alert('Error', 'Please enter a role name');
      return;
    }
    const newRole = customRole.trim();
    if (availableRoles.some(r => r.toLowerCase() === newRole.toLowerCase())) {
      Alert.alert('Error', 'This role already exists');
      return;
    }
    const updatedRoles = [...availableRoles, newRole];
    setAvailableRoles(updatedRoles);
    setPosition(newRole);
    setCustomRole('');
    setShowRoleDropdown(false);
    storageService.saveCustomRoles(updatedRoles.filter(r => !DEFAULT_ROLES.includes(r)));
  };

  const handleRoleSelect = (role) => {
    setPosition(role);
    setShowRoleDropdown(false);
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      const errorList = Object.values(errors).filter(Boolean);
      if (errorList.length > 0) {
        Alert.alert('Validation Error', errorList[0]);
      }
      return;
    }

    if (!isPremium() && staffList.length >= getMaxStaffCount()) {
      Alert.alert(
        'Limit Reached',
        `Free plan allows only ${getMaxStaffCount()} staff. Upgrade to Premium for unlimited.`
      );
      return;
    }

    try {
      await addStaff({
        name: name.trim(),
        position,
        phone: phone.trim(),
        salary: parseFloat(salary),
        salary_type: salaryType,
        note: note.trim(),
        joinedDate: new Date().toISOString(),
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error saving staff:', error);
      Alert.alert('Error', 'Failed to save staff. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Staff</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Full Name</Text>
          <View
            style={[styles.inputWrapper, errors.name && styles.inputError]}
          >
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
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Role</Text>
          <TouchableOpacity
            style={[styles.roleDropdown, errors.position && styles.inputError]}
            onPress={() => setShowRoleDropdown(!showRoleDropdown)}
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
          {showRoleDropdown && (
            <View style={styles.dropdownContainer}>
              <TextInput
                style={styles.customRoleInput}
                placeholder="Type to add new role..."
                placeholderTextColor="#9CA3AF"
                value={customRole}
                onChangeText={setCustomRole}
              />
              {customRole.trim() && (
                <TouchableOpacity
                  style={styles.addRoleBtn}
                  onPress={handleAddNewRole}
                >
                  <Icon name="add-circle-outline" size={20} color="#2563EB" />
                  <Text style={styles.addRoleText}>Add "{customRole.trim()}"</Text>
                </TouchableOpacity>
              )}
              <FlatList
                data={availableRoles}
                keyExtractor={(item) => item}
                style={styles.roleList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      position === item && styles.dropdownItemActive,
                    ]}
                    onPress={() => handleRoleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        position === item && styles.dropdownItemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {position === item && (
                      <Icon name="checkmark" size={18} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Phone Number</Text>
          <View
            style={[styles.inputWrapper, errors.phone && styles.inputError]}
          >
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
                onPress={() => setSalaryType(type.key)}
                style={[
                  styles.durationBtn,
                  salaryType === type.key && styles.durationBtnActive,
                ]}
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
              onChangeText={handleSalaryChange}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
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
          <View style={styles.quickSelectRow}>
            {QUICK_SELECT_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickSelectBtn,
                  parseFloat(salary) === amount && styles.quickSelectBtnActive,
                ]}
                onPress={() => handleSelectQuickAmount(amount)}
              >
                <Text
                  style={[
                    styles.quickSelectText,
                    parseFloat(salary) === amount && styles.quickSelectTextActive,
                  ]}
                >
                  ₹{amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.inputGroup, styles.cardStyle]}>
          <Text style={styles.label}>Note (Optional)</Text>
          <View style={styles.noteWrapper}>
            <Icon
              name="document-text"
              size={20}
              color="#6B7280"
              style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]}
            />
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Add any note for this staff..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Icon name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Save Staff</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

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
    maxHeight: 300,
  },
  customRoleInput: {
    fontSize: 15,
    color: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  addRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#EFF6FF',
  },
  addRoleText: { fontSize: 14, color: '#2563EB', marginLeft: 8, fontWeight: '500' },
  roleList: { maxHeight: 180 },
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
  quickSelectRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  quickSelectBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  quickSelectText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  quickSelectTextActive: { color: '#fff' },
  noteWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 100,
  },
  noteInput: {
    paddingTop: 12,
    minHeight: 100,
  },
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
});

export default AddStaffScreen;