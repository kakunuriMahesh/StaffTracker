import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { initDatabase } from './src/database/db';
import { initUserDB } from './src/database/userDb';
import { initJsonDatabase } from './src/services/jsonDataService';
import { syncData, addSyncListener, removeSyncListener, initSyncManager, stopSyncManager } from './src/services/syncManager';

import HomeScreen        from './src/screens/HomeScreen';
import DailyScreen       from './src/screens/DailyScreen';
import MonthlyScreen     from './src/screens/MonthlyScreen';
import AddStaffScreen    from './src/screens/AddStaffScreen';
import EditStaffScreen   from './src/screens/EditStaffScreen';
import StaffDetailScreen from './src/screens/StaffDetailScreen';
import ProfileScreen     from './src/screens/ProfileScreen';
import LoginScreen      from './src/screens/LoginScreen';
import SyncSettingsScreen from './src/screens/SyncSettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const deepLinking = {
  enabled: true,
  prefixes: ['stafftracker://', Linking.createURL('/')],
};

function Tabs({ navigation }) {
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

function MainAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="AddStaff" component={AddStaffScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditStaff" component={EditStaffScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StaffDetail" component={StaffDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SyncSettings" component={SyncSettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => {
    const init = async () => {
      console.log('[App] Starting initialization...');
      try {
        console.log('[App] Initializing staff database...');
        await initDatabase();
        console.log('[App] Staff database ready');
        
        console.log('[App] Initializing JSON database...');
        await initJsonDatabase();
        console.log('[App] JSON database ready');
        
        console.log('[App] Initializing user database...');
        await initUserDB();
        console.log('[App] User database ready');
        
        const unsubscribe = NetInfo.addEventListener(async (state) => {
          if (state.isConnected) {
            try {
              await initSyncManager();
            } catch (e) {
              console.log('Sync init error:', e);
            }
          }
        });
        
        console.log('[App] Initialization complete');
        setIsReady(true);
      } catch (error) {
        console.error('[App] Database init error:', error);
        setIsReady(true);
      }
    };
    init();
  }, []);

  const handleDeepLink = async (url) => {
  };

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
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
      <NavigationContainer linking={deepLinking}>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{ headerBackTitle: 'Back' }}
        >
          <Stack.Screen name="Auth" component={AuthStackNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="MainApp" component={MainAppStack} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}