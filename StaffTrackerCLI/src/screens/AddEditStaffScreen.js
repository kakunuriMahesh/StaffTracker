import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';

const AddEditStaffScreen = ({ navigation, route }) => {
  const { addStaff, updateStaff, canEditStaff, getMaxStaffCount, isPremium } = useApp();
  const editStaff = route.params?.staff;
  const isEditing = !!editStaff;

  const [name, setName] = useState(editStaff?.name || '');
  const [phone, setPhone] = useState(editStaff?.phone || '');
  const [position, setPosition] = useState(editStaff?.position || '');

  useEffect(() => {
    if (editStaff && !canEditStaff(editStaff)) {
      Alert.alert('Locked', 'This staff member is locked due to plan expiry.');
      navigation.goBack();
    }
  }, [editStaff]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter staff name');
      return;
    }

    const staffData = {
      name: name.trim(),
      phone: phone.trim(),
      position: position.trim(),
    };

    if (isEditing) {
      await updateStaff(editStaff.id, staffData);
    } else {
      await addStaff(staffData);
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {isEditing ? 'Edit Staff' : 'Add Staff'}
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter staff name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Position</Text>
          <TextInput
            style={styles.input}
            value={position}
            onChangeText={setPosition}
            placeholder="Enter position"
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update' : 'Add'} Staff
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddEditStaffScreen;