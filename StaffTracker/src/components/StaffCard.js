import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const StaffCard = ({ staff, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.info}>
        <Text style={styles.name}>{staff.name}</Text>
        <Text style={styles.position}>{staff.position}</Text>
      </View>
      <View style={styles.salaryContainer}>
        <Text style={styles.salary}>${staff.salary?.toLocaleString()}</Text>
        <Text style={styles.salaryLabel}>/month</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  position: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  salaryContainer: {
    alignItems: 'flex-end',
  },
  salary: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  salaryLabel: {
    fontSize: 12,
    color: '#999',
  },
});

export default StaffCard;