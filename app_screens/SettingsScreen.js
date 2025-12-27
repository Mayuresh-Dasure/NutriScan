import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';

const DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];
const HEALTH_GOALS = ['General Health', 'Weight Loss', 'Muscle Gain', 'Diabetes Control', 'Heart Health'];

export default function SettingsScreen({ navigation }) {
    const { colors, isDark, themePreference, setThemePreference } = useTheme();
    const [diet, setDiet] = useState(['Vegetarian']);
    const [goal, setGoal] = useState('General Health');
    const [reminders, setReminders] = useState({ water: true, track: true, protein: true });

    // Personal Details
    const [username, setUsername] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [gender, setGender] = useState('Male');

    const [loading, setLoading] = useState(true);
    const [savingDetails, setSavingDetails] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            const settingsRef = ref(database, `users/${user.uid}/settings`);
            const unsub = onValue(settingsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    if (data.diet) setDiet(Array.isArray(data.diet) ? data.diet : [data.diet]);
                    if (data.goal) setGoal(data.goal);
                    if (data.age) setAge(data.age.toString());
                    if (data.weight) setWeight(data.weight.toString());
                    if (data.height) setHeight(data.height.toString());
                    if (data.gender) setGender(data.gender);
                    if (data.username) setUsername(data.username);
                    if (data.profilePic) setProfilePic(data.profilePic);
                    if (data.reminders) setReminders(data.reminders);
                }
                setLoading(false);
            });
            return unsub;
        }
    }, []);

    const pickProfileImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // Determine if we use URI or Base64. For simple Firebase RTDB text storage, Base64 is easier.
                const imgData = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setProfilePic(imgData);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not pick image');
        }
    };

    const saveDetails = async () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseFloat(age);

        if (!w || !h || !a) {
            Alert.alert('Error', 'Please enter valid numbers for Age, Weight, and Height');
            return;
        }

        setSavingDetails(true);
        // Recalculate Limits
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += (gender === 'Male' ? 5 : -161);
        let tdee = bmr * 1.2;

        let targetCalories = Math.round(tdee);
        let targetProtein = Math.round(w * 0.8);

        switch (goal) {
            case 'Weight Loss': targetCalories -= 500; targetProtein = Math.round(w * 1.5); break;
            case 'Muscle Gain': targetCalories += 300; targetProtein = Math.round(w * 1.8); break;
            case 'Heart Health':
            case 'Diabetes Control':
                targetProtein = Math.round(w * 1.0); break;
        }
        if (targetCalories < 1200) targetCalories = 1200;

        const limits = { calories: targetCalories, protein: targetProtein };

        const user = auth.currentUser;
        if (user) {
            try {
                // Update everything including username and profilePic
                await update(ref(database, `users/${user.uid}/settings`), {
                    age, weight, height, gender, calculatedLimits: limits,
                    username, profilePic
                });
                Alert.alert('Success', 'Profile updated!');
            } catch (error) {
                Alert.alert('Error', 'Failed to save details');
            } finally {
                setSavingDetails(false);
            }
        }
    };

    const toggleReminder = (key) => {
        const newReminders = { ...reminders, [key]: !reminders[key] };
        setReminders(newReminders);

        const user = auth.currentUser;
        if (user) {
            update(ref(database, `users/${user.uid}/settings`), { reminders: newReminders });
        }
    };

    const saveSetting = async (key, value) => {
        let newValue;
        if (key === 'diet') {
            if (diet.includes(value)) {
                newValue = diet.filter(d => d !== value);
            } else {
                newValue = [...diet, value];
            }
            if (newValue.length === 0) return;
            setDiet(newValue);
        } else {
            newValue = value;
            setGoal(newValue);
        }

        const user = auth.currentUser;
        if (user) {
            try {
                await update(ref(database, `users/${user.uid}/settings`), {
                    [key]: newValue
                });
            } catch (error) {
                Alert.alert('Error', 'Failed to save setting');
            }
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut(auth);
                        } catch (error) {
                            Alert.alert("Error", error.message);
                        }
                    }
                }
            ]
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#208091" /></View>;

    const OptionGroup = ({ title, options, selected, onSelect, type }) => (
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
            <View style={styles.optionsGrid}>
                {options.map((opt) => {
                    const isSelected = type === 'diet'
                        ? selected.includes(opt)
                        : selected === opt;

                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[
                                styles.option,
                                { backgroundColor: colors.background, borderColor: colors.border },
                                isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                            ]}
                            onPress={() => saveSetting(type, opt)}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: colors.text.secondary },
                                isSelected && { color: '#fff', fontWeight: '700' }
                            ]}>
                                {opt}
                            </Text>
                            {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={['#208091', '#16a085']}
                style={styles.headerGradient}
            >
                {/* Header Top Row with Back Button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <TouchableOpacity
                        onPress={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.replace('Home'); // Fallback if history is lost
                            }
                        }}
                        style={{ padding: 8, marginLeft: -8, borderRadius: 20 }}
                        activeOpacity={0.6}
                    >
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginLeft: 8 }}>Settings</Text>
                </View>

                {/* Profile Info */}
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={pickProfileImage} style={styles.avatarContainer}>
                        {profilePic ? (
                            <Image source={{ uri: profilePic }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : (auth.currentUser?.email?.[0]?.toUpperCase() || 'U')}</Text>
                            </View>
                        )}
                        <View style={styles.editIconBadge}>
                            <MaterialIcons name="edit" size={12} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{username || 'User'}</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>{auth.currentUser?.email}</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.content}>

                <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>My Profile</Text>

                    <View style={styles.inputWrapper}>
                        <Text style={[styles.label, { color: colors.text.secondary }]}>Display Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter your name"
                            placeholderTextColor={colors.text.muted}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.text.secondary }]}>Age</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]}
                                value={age} onChangeText={setAge} keyboardType="numeric" placeholder="25" placeholderTextColor={colors.text.muted}
                            />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.text.secondary }]}>Gender</Text>
                            <TouchableOpacity
                                style={[styles.genderToggle, { backgroundColor: colors.background, borderColor: colors.border }]}
                                onPress={() => setGender(gender === 'Male' ? 'Female' : 'Male')}
                            >
                                <Text style={[styles.genderText, { color: colors.text.primary }]}>{gender}</Text>
                                <MaterialIcons name={gender === 'Male' ? 'male' : 'female'} size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputRow}>
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.text.secondary }]}>Weight (kg)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]}
                                value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="70" placeholderTextColor={colors.text.muted}
                            />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.text.secondary }]}>Height (cm)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text.primary }]}
                                value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="175" placeholderTextColor={colors.text.muted}
                            />
                        </View>
                    </View>
                </View>

                <OptionGroup
                    title="Dietary Preference"
                    options={DIET_TYPES}
                    selected={diet}
                    type="diet"
                />

                <OptionGroup
                    title="Health Goal"
                    options={HEALTH_GOALS}
                    selected={goal}
                    type="goal"
                />

                <TouchableOpacity onPress={saveDetails} disabled={savingDetails}>
                    <LinearGradient
                        colors={['#208091', '#16a085']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButton}
                    >
                        {savingDetails ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Update Profile & Targets</Text>}
                    </LinearGradient>
                </TouchableOpacity>


                {/* Smart Reminders */}
                <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Smart Reminders</Text>
                    <View style={{ gap: 0 }}>
                        {[
                            { id: 'water', label: 'Drink Water', icon: 'local-drink' },
                            { id: 'track', label: 'Track Meals', icon: 'restaurant' },
                            { id: 'protein', label: 'Protein Target', icon: 'fitness-center' }
                        ].map((item, index) => {
                            const isEnabled = reminders[item.id];
                            return (
                                <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: index === 2 ? 0 : 1, borderBottomColor: isDark ? '#333' : '#f0f2f5' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialIcons name={item.icon} size={20} color={COLORS.primary} />
                                        <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '500', color: colors.text.primary }}>{item.label}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: isEnabled ? COLORS.primary : (isDark ? '#444' : '#e5e7eb'), alignItems: isEnabled ? 'flex-end' : 'flex-start', justifyContent: 'center', paddingHorizontal: 3 }}
                                        onPress={() => toggleReminder(item.id)}
                                    >
                                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' }} />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Theme Selection Section */}
                <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Appearance</Text>
                    <View style={styles.content}>
                        <View style={styles.reminderRow}>
                            <View style={styles.reminderLabel}>
                                <View style={[styles.themeIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', borderRadius: RADIUS.full, padding: 8 }]}>
                                    <MaterialIcons name="brightness-6" size={20} color={isDark ? '#fff' : COLORS.primary} />
                                </View>
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>Manual Dark Mode</Text>
                                    <Text style={{ color: colors.text.muted, fontSize: 12 }}>Override system appearance</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.switch, { backgroundColor: themePreference === 'dark' ? COLORS.primary : (isDark ? '#444' : '#e5e7eb'), alignItems: themePreference === 'dark' ? 'flex-end' : 'flex-start', justifyContent: 'center', width: 40, height: 22, borderRadius: 11, paddingHorizontal: 3 }]}
                                onPress={() => setThemePreference(themePreference === 'dark' ? 'system' : 'dark')}
                            >
                                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* About Section */}
                <View style={[styles.sectionContainer, { marginTop: 0, backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>About App</Text>
                    <Text style={[styles.aboutText, { color: colors.text.secondary }]}>
                        NutriScanner helps you make healthier food choices by analyzing nutrition labels instantly.
                    </Text>
                    <Text style={[styles.aboutText, { marginTop: 8, fontSize: 13, color: colors.text.muted }]}>Version 1.0.0</Text>
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    onPress={handleLogout}
                    style={[
                        styles.logoutButton,
                        { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#ffebee' }
                    ]}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="logout" size={20} color="#e74c3c" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 20 },

    avatarContainer: { position: 'relative' },
    avatarPlaceholder: {
        width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarImage: {
        width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#fff'
    },
    editIconBadge: {
        position: 'absolute', bottom: 0, right: 0, backgroundColor: '#208091',
        width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },

    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    content: { padding: 20, marginTop: -20 },
    sectionContainer: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    option: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    optionText: { fontSize: 14, fontWeight: '500' },

    inputRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    inputWrapper: { flex: 1, marginBottom: 16 },
    label: { fontSize: 13, marginBottom: 6, fontWeight: '500' },
    input: { borderWidth: 1, padding: 14, borderRadius: 12, fontSize: 16 },
    genderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, padding: 14, borderRadius: 12 },
    genderText: { fontSize: 16 },

    saveButton: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
    saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    aboutText: { fontSize: 14, lineHeight: 20 },

    logoutButton: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        padding: 16, borderRadius: 16, borderWidth: 1,
        gap: 8, marginBottom: 40
    },
    logoutText: { color: '#e74c3c', fontSize: 16, fontWeight: '700' },

    // Additional style parts for rows to avoid crashes if they were missing
    reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
    reminderLabel: { flexDirection: 'row', alignItems: 'center' },
    switch: { justifyContent: 'center', paddingHorizontal: 3 },
    switchDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' }
});
