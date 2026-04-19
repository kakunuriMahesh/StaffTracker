import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import StaffListScreen from '../screens/StaffListScreen';
import AddEditStaffScreen from '../screens/AddEditStaffScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import PlanScreen from '../screens/PlanScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="StaffList" 
          component={StaffListScreen} 
          options={{ title: 'Staff' }}
        />
        <Stack.Screen 
          name="AddEditStaff" 
          component={AddEditStaffScreen} 
          options={{ title: 'Staff' }}
        />
        <Stack.Screen 
          name="Attendance" 
          component={AttendanceScreen} 
          options={{ title: 'Attendance' }}
        />
        <Stack.Screen 
          name="Plan" 
          component={PlanScreen} 
          options={{ title: 'Plan Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;