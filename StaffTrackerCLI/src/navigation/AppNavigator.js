import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import DailyScreen from '../screens/DailyScreen';
import MonthlyScreen from '../screens/MonthlyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddStaffScreen from '../screens/AddStaffScreen';
import EditStaffScreen from '../screens/EditStaffScreen';
import StaffDetailScreen from '../screens/StaffDetailScreen';
import PlansScreen from '../screens/PlansScreen';
import SyncSettingsScreen from '../screens/SyncSettingsScreen';
import ArchiveScreen from '../screens/ArchiveScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'DailyTab') {
            iconName = focused ? 'today' : 'today-outline';
          } else if (route.name === 'MonthlyTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Icon name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Staff' }}
      />
      <Tab.Screen
        name="DailyTab"
        component={DailyScreen}
        options={{ tabBarLabel: 'Today' }}
      />
      <Tab.Screen
        name="MonthlyTab"
        component={MonthlyScreen}
        options={{ tabBarLabel: 'Monthly' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="AddStaff" component={AddStaffScreen} />
      <Stack.Screen name="EditStaff" component={EditStaffScreen} />
      <Stack.Screen name="StaffDetail" component={StaffDetailScreen} />
      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="SyncSettings" component={SyncSettingsScreen} />
      <Stack.Screen name="Archive" component={ArchiveScreen} />
    </Stack.Navigator>
  );
}

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
          name="MainApp"
          component={MainStack}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;