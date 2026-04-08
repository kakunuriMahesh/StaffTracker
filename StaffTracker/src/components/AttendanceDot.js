import React from 'react';
import { View, StyleSheet } from 'react-native';

const AttendanceDot = ({ status }) => {
  const getColor = () => {
    switch (status) {
      case 'P': return '#4CAF50';
      case 'A': return '#F44336';
      case 'L': return '#FF9800';
      default: return '#ccc';
    }
  };

  return <View style={[styles.dot, { backgroundColor: getColor() }]} />;
};

const styles = StyleSheet.create({
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default AttendanceDot;