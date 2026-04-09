import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { initDatabase } from './src/database/db';

import HomeScreen        from './src/screens/HomeScreen';
import DailyScreen       from './src/screens/DailyScreen';
import MonthlyScreen     from './src/screens/MonthlyScreen';
import AddStaffScreen    from './src/screens/AddStaffScreen';
import EditStaffScreen   from './src/screens/EditStaffScreen';
import StaffDetailScreen from './src/screens/StaffDetailScreen';
import ProfileScreen     from './src/screens/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
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
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"    component={HomeScreen}    options={{ tabBarLabel: 'Staff' }} />
      <Tab.Screen name="DailyTab"   component={DailyScreen}   options={{ tabBarLabel: 'Today' }} />
      <Tab.Screen name="MonthlyTab" component={MonthlyScreen} options={{ tabBarLabel: 'Monthly' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setIsReady(true);
      } catch (error) {
        console.error('Database init error:', error);
      }
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerBackTitle: 'Back' }}>
          <Stack.Screen name="Tabs"        component={Tabs}             options={{ headerShown: false }} />
          <Stack.Screen name="AddStaff"    component={AddStaffScreen}   options={{ headerShown: false }} />
          <Stack.Screen name="EditStaff"   component={EditStaffScreen}  options={{ headerShown: false }} />
          <Stack.Screen name="StaffDetail" component={StaffDetailScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}