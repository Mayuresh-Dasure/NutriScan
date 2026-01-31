import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, DARK_THEME, LIGHT_THEME, SHADOWS } from './constants/theme';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { auth, database } from './services/firebaseConfig';

import AchievementsScreen from './app_screens/AchievementsScreen';
import DiaryScreen from './app_screens/DiaryScreen'; // Consolidated Screen
import EditProfileScreen from './app_screens/EditProfileScreen';
import HomeScreen from './app_screens/HomeScreen';
import LoginScreen from './app_screens/LoginScreen';
import ManualEntryScreen from './app_screens/ManualEntryScreen';
import OnboardingScreen from './app_screens/OnboardingScreen';
import ProfileScreen from './app_screens/ProfileScreen';
import ResultScreen from './app_screens/ResultScreen';
import ScanScreen from './app_screens/ScanScreen';
import SettingsScreen from './app_screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomScanButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={{
      top: -20,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.premium
    }}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={{
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: COLORS.primary, // Using Theme constant directly or pass from props
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: '#fff', // White ring for separation
    }}>
      {children}
    </View>
  </TouchableOpacity>
);

// MainTabs removed - Using pure stack navigation
function RootNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const { theme, colors, isDark } = useTheme();

  useEffect(() => {
    // Guard against null auth when Firebase fails to initialize
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setOnboardingComplete(false);
      }
    });

    return unsubAuth;
  }, []);

  useEffect(() => {
    if (user) {
      const settingsRef = ref(database, `users/${user.uid}/settings`);

      // Safety timeout in case DB is unreachable
      const safetyTimeout = setTimeout(() => {
        console.log('DEBUG: Firebase DB timeout - forcing app load');
        setLoading(false);
      }, 5000);

      const unsubSettings = onValue(settingsRef, (snapshot) => {
        clearTimeout(safetyTimeout);
        const data = snapshot.val();
        if (data && (data.onboardingComplete === true || data.diet || data.calculatedLimits)) {
          setOnboardingComplete(true);
        } else {
          setOnboardingComplete(false);
        }
        setLoading(false);
      }, (error) => {
        clearTimeout(safetyTimeout);
        console.error('DEBUG: Firebase DB Error:', error);
        setLoading(false); // Stop loading even on error
      });

      return () => {
        clearTimeout(safetyTimeout);
        unsubSettings();
      };
    }
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navigationTheme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
        ) : !onboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Diary" component={DiaryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />

            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="ManualEntry"
              component={ManualEntryScreen}
              options={{ animation: 'slide_from_bottom' }}
            />

            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
