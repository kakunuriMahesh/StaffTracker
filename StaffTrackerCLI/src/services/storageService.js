import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  STAFF: '@staff_list',
  ATTENDANCE: '@attendance_data',
  PLAN: '@plan_info',
};

export const storageService = {
  async getStaffList() {
    try {
      const data = await AsyncStorage.getItem(KEYS.STAFF);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting staff list:', error);
      return [];
    }
  },

  async saveStaffList(staffList) {
    try {
      await AsyncStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
    } catch (error) {
      console.error('Error saving staff list:', error);
    }
  },

  async getAttendance() {
    try {
      const data = await AsyncStorage.getItem(KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting attendance:', error);
      return {};
    }
  },

  async saveAttendance(attendance) {
    try {
      await AsyncStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendance));
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  },

  async getPlan() {
    try {
      const data = await AsyncStorage.getItem(KEYS.PLAN);
      return data ? JSON.parse(data) : {
        type: 'Free',
        status: 'Active',
        expiryDate: null,
      };
    } catch (error) {
      console.error('Error getting plan:', error);
      return { type: 'Free', status: 'Active', expiryDate: null };
    }
  },

  async savePlan(plan) {
    try {
      await AsyncStorage.setItem(KEYS.PLAN, JSON.stringify(plan));
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  },

  async clearAll() {
    try {
      await AsyncStorage.multiRemove([KEYS.STAFF, KEYS.ATTENDANCE, KEYS.PLAN]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};