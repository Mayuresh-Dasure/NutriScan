import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DarkScheme, LightScheme } from '../constants/theme';
import { auth, database } from '../services/firebaseConfig';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@theme_preference';

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themePreference, setThemePreferenceState] = useState('system'); // 'system', 'dark', or 'light'
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUserId(user?.uid || null);
        });
        return unsubscribe;
    }, []);

    // Load theme preference from Firebase when user logs in
    useEffect(() => {
        if (!currentUserId) {
            // User logged out, load from AsyncStorage only
            const loadLocalTheme = async () => {
                try {
                    const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                    if (savedPreference && ['system', 'dark', 'light'].includes(savedPreference)) {
                        setThemePreferenceState(savedPreference);
                    }
                } catch (error) {
                    console.log('Error loading theme preference:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            loadLocalTheme();
            return;
        }

        // User logged in, listen to Firebase
        const themeRef = ref(database, `users/${currentUserId}/settings/themePreference`);
        const unsubscribe = onValue(themeRef, async (snapshot) => {
            const firebaseTheme = snapshot.val();

            if (firebaseTheme && ['system', 'dark', 'light'].includes(firebaseTheme)) {
                // Use Firebase value
                setThemePreferenceState(firebaseTheme);
                // Also update AsyncStorage for offline access
                try {
                    await AsyncStorage.setItem(THEME_STORAGE_KEY, firebaseTheme);
                } catch (error) {
                    console.log('Error saving to AsyncStorage:', error);
                }
            } else {
                // No Firebase value, check AsyncStorage
                try {
                    const localTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                    if (localTheme && ['system', 'dark', 'light'].includes(localTheme)) {
                        setThemePreferenceState(localTheme);
                        // Sync to Firebase
                        await update(ref(database, `users/${currentUserId}/settings`), {
                            themePreference: localTheme
                        });
                    } else {
                        // Default to 'system'
                        setThemePreferenceState('system');
                        await update(ref(database, `users/${currentUserId}/settings`), {
                            themePreference: 'system'
                        });
                    }
                } catch (error) {
                    console.log('Error loading theme:', error);
                }
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, [currentUserId]);

    // Determine the active theme based on preference
    const getActiveTheme = () => {
        if (themePreference === 'system') {
            return systemScheme || 'light';
        }
        return themePreference;
    };

    const theme = getActiveTheme();
    const colors = theme === 'dark' ? DarkScheme : LightScheme;
    const isDark = theme === 'dark';

    // Function to update theme preference
    const setThemePreference = async (newPreference) => {
        if (!['system', 'dark', 'light'].includes(newPreference)) {
            console.warn('Invalid theme preference:', newPreference);
            return;
        }

        try {
            // Update local state immediately for instant UI update
            setThemePreferenceState(newPreference);

            // Save to AsyncStorage
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);

            // Save to Firebase if user is logged in
            if (currentUserId) {
                await update(ref(database, `users/${currentUserId}/settings`), {
                    themePreference: newPreference
                });
            }
        } catch (error) {
            console.log('Error saving theme preference:', error);
        }
    };

    // Don't render children until theme preference is loaded
    if (isLoading) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{
            theme,
            colors,
            isDark,
            themePreference,
            setThemePreference
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
