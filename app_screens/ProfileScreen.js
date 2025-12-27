import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StatusBar, StyleSheet, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { Card } from '../components/Card';
import { GradientButton } from '../components/GradientButton';
import { ProgressRing } from '../components/Progress';
import { Body, Heading, Label } from '../components/Typography';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';
import { getHabitStats } from '../services/habitService';

const DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];

export default function ProfileScreen({ navigation }) {
    const { colors, isDark, themePreference, setThemePreference } = useTheme();
    const [username, setUsername] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [age, setAge] = useState('28');
    const [dob, setDob] = useState(null);
    const [goal, setGoal] = useState('Muscle Gain');
    const [streak, setStreak] = useState(0);
    const [diets, setDiets] = useState([]); // Support multiple diets
    const [weeklyActivity, setWeeklyActivity] = useState([]); // Last 7 days data
    const [weeklyStats, setWeeklyStats] = useState({ totalLogs: 0 });
    const [selectedDay, setSelectedDay] = useState(null);
    const [reminders, setReminders] = useState({ water: true, track: true, protein: true });


    // Editable Targets
    const [calories, setCalories] = useState('2500');
    const [protein, setProtein] = useState('120');
    const [water, setWater] = useState('3.0');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Dynamic Ring Size Calculation
    const screenWidth = Dimensions.get('window').width;
    const availableWidth = screenWidth - (SPACING.screen * 2) - 32; // 20px padding * 2, 16px card padding * 2
    const minGap = 10;
    // Try to fit 40px rings with min 10px gap
    // 7 * 40 + 6 * 10 = 280 + 60 = 340. If avail < 340, reduce ring.
    // Optimal calculation:
    const calculatedSize = (availableWidth - (6 * 12)) / 7; // Target 12px gap minimum
    const ringSize = Math.min(Math.max(calculatedSize, 32), 42); // Clamp between 32 and 42

    const calculateAge = (dobString) => {
        if (!dobString) return null;
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            const settingsRef = ref(database, `users/${user.uid}/settings`);
            // Fetch Settings
            const unsub = onValue(settingsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    if (data.username) setUsername(data.username);
                    if (data.profilePic) setProfilePic(data.profilePic);
                    if (data.age) setAge(data.age.toString());
                    if (data.dob) setDob(data.dob);
                    if (data.goal) setGoal(data.goal);

                    // Handle both string and array for diet
                    if (data.diet) {
                        setDiets(Array.isArray(data.diet) ? data.diet : [data.diet]);
                    }

                    if (data.calculatedLimits) {
                        setCalories(data.calculatedLimits.calories.toString());
                        setProtein(data.calculatedLimits.protein.toString());
                        if (data.calculatedLimits.water) setWater(data.calculatedLimits.water.toString());
                    }

                    if (data.reminders) {
                        setReminders(data.reminders);
                    }
                }
                setLoading(false);
            });

            // Fetch Streak
            getHabitStats(user.uid).then(stats => {
                if (stats && stats.currentStreak) setStreak(stats.currentStreak);
            });

            // Fetch Weekly Activity (Logs)
            const logsRef = ref(database, `users/${user.uid}/foodLogs`);
            onValue(logsRef, (snapshot) => {
                const logs = snapshot.val() || {};
                const now = new Date();
                const last7Days = [];
                const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

                // Generate last 7 days (including today)
                // Actually, UI shows M T W T F S S usually, or just last 7 days relative to today?
                // The UI dummy data was static M T W... 
                // Let's make it dynamic: [Today-6, ..., Today]

                let weekTotalLogs = 0;

                for (let i = 6; i >= 0; i--) { // 6 days ago to today
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    d.setHours(0, 0, 0, 0);

                    const dayName = dayLabels[d.getDay()]; // 0=Sun, 1=Mon...

                    // Sum calories for this day
                    let dailyCal = 0, dailyProt = 0, dailyCarbs = 0, dailyFat = 0;
                    const dayStart = d.getTime();
                    const dayEnd = dayStart + 86400000;

                    Object.values(logs).forEach(log => {
                        if (log.timestamp >= dayStart && log.timestamp < dayEnd) {
                            dailyCal += (parseFloat(log.calories) || 0);
                            dailyProt += (parseFloat(log.protein) || 0);
                            dailyCarbs += (parseFloat(log.carbohydrates) || 0);
                            dailyFat += (parseFloat(log.totalFat) || 0);
                            weekTotalLogs++;
                        }
                    });

                    // We can just store the 'dailyCal' in state and render the % in the View using 'calories' state.

                    // We can just store the 'dailyCal' in state and render the % in the View using 'calories' state.

                    last7Days.push({
                        day: dayName,
                        value: dailyCal,
                        isToday: i === 0,
                        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        macros: { p: Math.round(dailyProt), c: Math.round(dailyCarbs), f: Math.round(dailyFat) }
                    });
                }
                setWeeklyActivity(last7Days);
                setWeeklyStats({ totalLogs: weekTotalLogs });
            });

            return unsub;
        }
    }, [calories]); // Add calories to dependency so if goal changes, we re-render? No, useEffect runs once on mount. 
    // Wait, if I add [calories], it re-runs everything including 'unsub', which is fine but slightly wasteful re-subscribing.
    // Better: separate the log fetching or just use the current 'calories' state in render.
    // I put 'setWeeklyActivity' with raw values (or cal values). 
    // In render map, I will do (item.value / parseInt(calories)) * 100.
    // So useEffect dependency doesn't need 'calories' if 'weeklyActivity' stores absolute values.
    // Confirmed: I will store absolute calories in 'weeklyActivity' and compute % in render.
    // Correction: I need to allow onValue to persist, so I shouldn't put it in a useEffect that re-runs often or I must cleanup properly.
    // The current structure has one huge useEffect with [] dep. 
    // I will keep it there. Logs listener will define the setWeeklyActivity.


    const pickProfileImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets?.[0]) {
                const imgData = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setProfilePic(imgData);
                saveSetting('profilePic', imgData);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not pick image');
        }
    };

    const handleDietToggle = (type) => {
        let newDiets;
        if (diets.includes(type)) {
            newDiets = diets.filter(d => d !== type);
        } else {
            newDiets = [...diets, type];
        }
        setDiets(newDiets);
        saveSetting('diet', newDiets);
    };

    const toggleReminder = (key) => {
        const newReminders = { ...reminders, [key]: !reminders[key] };
        setReminders(newReminders);
        saveSetting('reminders', newReminders);
    };

    const saveSetting = async (key, value) => {
        const user = auth.currentUser;
        if (user) {
            try {
                await update(ref(database, `users/${user.uid}/settings`), { [key]: value });
            } catch (err) { console.log(err); }
        }
    };

    const handleSaveTargets = async () => {
        setSaving(true);
        const user = auth.currentUser;
        if (user) {
            try {
                await update(ref(database, `users/${user.uid}/settings`), {
                    age: parseInt(age),
                    calculatedLimits: {
                        calories: parseInt(calories),
                        protein: parseInt(protein),
                        water: parseFloat(water)
                    },
                    diet: diets
                });
                Alert.alert('Success', 'Profile updated!');
            } catch (err) {
                Alert.alert('Error', 'Failed to save changes');
            }
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        Alert.alert("Log Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: 'destructive', onPress: () => signOut(auth) }
        ]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    const displayAge = dob ? calculateAge(dob) + ' years' : (age ? age + ' years' : 'DOB');

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Compact Header */}
            <LinearGradient colors={['#059669', '#0d9488']} style={styles.header}>
                {/* Nav Bar */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ padding: 8, borderRadius: 20, marginLeft: -4 }}
                        activeOpacity={0.6}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: 4 }}>
                        <Ionicons name="settings-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerContent}>
                    <View style={styles.avatarFrame}>
                        {profilePic ? (
                            <Image source={{ uri: profilePic }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholder]}>
                                <Heading level={1} inverse>{username?.[0] || 'U'}</Heading>
                            </View>
                        )}
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Heading level={2} inverse>{username || 'User'}</Heading>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('EditProfile', {
                                    currentData: {
                                        username, age, diet: diets, profilePic, dob,
                                        calculatedLimits: { calories, protein, water }
                                    }
                                })}
                                style={styles.editIconButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="pencil" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Body inverse style={styles.headerSubtext}>{displayAge} • {diets.length > 0 ? diets.join(', ') : 'No Diet Set'}</Body>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            {/* Computed Health Score Badge */}
                            <View style={[styles.goalBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981' }]}>
                                <Ionicons name="pulse" size={14} color="#10b981" />
                                <Label inverse style={[styles.goalLabelText, { color: '#10b981' }]}>
                                    {(() => {
                                        if (!weeklyActivity || weeklyActivity.length === 0) return 'Health Score: 0/100';
                                        const activeDays = weeklyActivity.filter(d => d.value > 0).length;
                                        // Simple calc: (Active / 7) * 60 + (Streak > 0 ? 20 : 0) + (loggedToday ? 20 : 0)
                                        // Simplified for MVP: (ActiveDays / 7) * 100
                                        const score = Math.round((activeDays / 7) * 100);
                                        return activeDays > 0 ? `Health Score: ${score}/100` : 'Get Started';
                                    })()}
                                </Label>
                            </View>
                            {streak > 0 ? (
                                <View style={[styles.goalBadge, { backgroundColor: 'rgba(249, 115, 22, 0.2)', borderColor: '#f97316' }]}>
                                    <Ionicons name="flame" size={12} color="#f97316" />
                                    <Label inverse style={[styles.goalLabelText, { color: '#f97316' }]}>{streak} Day Streak</Label>
                                </View>
                            ) : (
                                <View style={[styles.goalBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                    <Ionicons name="flame-outline" size={12} color="#ddd" />
                                    <Label inverse style={[styles.goalLabelText, { color: '#ddd' }]}>Start your streak today!</Label>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {/* Daily Targets, Diet, Reminders Moved to Settings */}

                {/* Refined Weekly Activity - Kept as Stats */}
                <View style={styles.sectionContainer}>
                    <View style={{ marginBottom: 12 }}>
                        <Heading level={3} style={{ fontWeight: '700', fontSize: 16 }}>Weekly Activity</Heading>
                        <Label style={{ color: COLORS.text.muted, fontSize: 13, marginTop: 2 }}>Daily calorie goals met</Label>
                    </View>
                    <Card style={styles.activityCard}>
                        <View style={styles.activityGrid}>
                            <View style={styles.goalLineContainer}>
                                <View style={styles.goalLine} />
                                <Label style={styles.goalLineLabel}>100%</Label>
                            </View>
                            {weeklyActivity.map((item, i) => {
                                const target = parseInt(calories) || 2000;
                                const progress = Math.min(Math.round((item.value / target) * 100), 100);
                                const isToday = item.isToday;
                                const barHeight = progress; // % height

                                const getBarColor = () => {
                                    if (progress >= 100) return COLORS.primary; // 100%+ (Green)
                                    if (progress >= 50) return COLORS.accent.medium; // 50-99% (Yellow)
                                    if (progress > 0) return COLORS.accent.high; // 1-49% (Red)
                                    return COLORS.border; // 0% (Gray)
                                };

                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.dayCol}
                                        onPress={() => setSelectedDay(item)}
                                        activeOpacity={0.6}
                                    >
                                        <View style={[styles.barTrack, isToday && { width: 14, backgroundColor: COLORS.border }]}>
                                            <View
                                                style={[
                                                    styles.barFill,
                                                    {
                                                        height: `${barHeight}%`,
                                                        backgroundColor: getBarColor(),
                                                        opacity: isToday ? 1 : 0.6
                                                    }
                                                ]}
                                            />
                                        </View>

                                        {/* Day Label */}
                                        <View style={{ alignItems: 'center', marginTop: 8 }}>
                                            <Label style={[
                                                styles.dayLabel,
                                                isToday && { color: COLORS.primary, fontWeight: '800' }
                                            ]}>
                                                {item.day}
                                            </Label>
                                            {isToday && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 2 }} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Ionicons name="ribbon" size={16} color={COLORS.primary} />
                            <Label style={{ color: COLORS.text.secondary, fontWeight: '600', fontSize: 13 }}>
                                {(() => {
                                    const target = parseInt(calories) || 2000;
                                    let metCount = 0;
                                    let totalPct = 0;
                                    weeklyActivity.forEach(d => {
                                        const p = Math.min(Math.round((d.value / target) * 100), 100);
                                        if (p >= 100) metCount++;
                                        totalPct += p;
                                    });
                                    const avg = Math.round(totalPct / 7);
                                    return `${metCount} Days Goal Met • ${avg}% Avg Completion`;
                                })()}
                            </Label>
                        </View>
                    </Card>
                </View>

                <View style={styles.sectionDivider} />

                {/* Personal Insights */}
                <View style={styles.sectionContainer}>
                    <Heading level={3} style={styles.sectionTitle}>Personal Insights</Heading>
                    <Card style={[styles.activityCard, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
                        <View style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                            justifyContent: 'center', alignItems: 'center'
                        }}>
                            <Ionicons name="bulb" size={20} color="#f59e0b" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Body style={{ fontStyle: 'italic', color: COLORS.text.secondary }}>
                                {(() => {
                                    if (streak > 3) return "You're on a roll! Keep up the consistency to reach your goals faster.";
                                    const activeDays = weeklyActivity.filter(d => d.value > 0).length;
                                    if (activeDays >= 5) return "Fantastic dedication! You've been active almost every day this week.";
                                    if (weeklyStats.totalLogs > 10) return "Great logging habit! Detailed tracking helps identify hidden calories.";
                                    if (activeDays > 0) return "Good start! Try to log your meals consistently for better results.";
                                    return "Your insights will appear here as you track your meals and build your streak.";
                                })()}
                            </Body>
                        </View>
                    </Card>
                </View>

            </View>

            {/* Daily Breakdown Modal */}
            <Modal
                transparent={true}
                visible={!!selectedDay}
                animationType="fade"
                onRequestClose={() => setSelectedDay(null)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedDay(null)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        {selectedDay && (
                            <>
                                <Heading level={3} style={{ marginBottom: 4 }}>{selectedDay.date}</Heading>
                                <Label style={{ color: COLORS.text.secondary, marginBottom: 20 }}>Daily Summary</Label>

                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 }}>
                                    <Heading level={1} style={{ color: COLORS.primary, fontSize: 32 }}>{selectedDay.value}</Heading>
                                    <Label style={{ marginBottom: 6, marginLeft: 6, fontSize: 16 }}>/ {calories} kcal</Label>
                                </View>

                                <View style={styles.modalStatsRow}>
                                    <View style={styles.modalStatItem}>
                                        <Label>Protein</Label>
                                        <Body style={{ fontWeight: '700' }}>{selectedDay.macros.p}g</Body>
                                    </View>
                                    <View style={[styles.modalStatItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border }]}>
                                        <Label>Carbs</Label>
                                        <Body style={{ fontWeight: '700' }}>{selectedDay.macros.c}g</Body>
                                    </View>
                                    <View style={styles.modalStatItem}>
                                        <Label>Fat</Label>
                                        <Body style={{ fontWeight: '700' }}>{selectedDay.macros.f}g</Body>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDay(null)}>
                                    <Body style={{ color: '#fff', fontWeight: '700' }}>Close</Body>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header Styles
    // Header Styles
    header: {
        paddingTop: 48,
        paddingBottom: 24,
        paddingHorizontal: SPACING.screen,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarFrame: { position: 'relative' },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)'
    },
    placeholder: { backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    editBadge: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#fff', width: 22, height: 22, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft
    },
    profileInfo: { flex: 1 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerSubtext: { opacity: 0.9, fontSize: 13, marginBottom: 4 },
    goalBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: RADIUS.full, alignSelf: 'flex-start',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    goalLabelText: { fontWeight: '700', marginLeft: 4, fontSize: 10 },

    // Content & Sections
    content: { paddingHorizontal: SPACING.screen, paddingTop: 32 },
    sectionContainer: { marginBottom: 8 },
    sectionDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 24, opacity: 0.6 },
    sectionTitle: { marginBottom: 16, fontWeight: '700', fontSize: 16 },

    // Diet Grid Style (Updated)
    dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dietChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.full,
        backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, gap: 6,
        ...SHADOWS.soft
    },
    dietChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    dietChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },
    dietChipTextActive: { color: "#fff" },

    // Targets Card
    targetsCard: { padding: 16 },
    inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    inputBox: { flex: 1 },
    inputLabel: { fontSize: 12, color: COLORS.text.muted, marginBottom: 6, textAlign: 'center' },
    input: {
        backgroundColor: '#f9fafb', borderWidth: 1, borderColor: COLORS.border,
        padding: 10, borderRadius: RADIUS.sm, fontSize: 15, fontWeight: '700',
        textAlign: 'center', color: COLORS.text.primary
    },
    saveBtn: { marginTop: 4 },

    // Weekly Activity
    activityCard: { paddingVertical: 24, paddingHorizontal: 16 },
    activityGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, marginBottom: 12, position: 'relative' },

    // Bar Chart
    goalLineContainer: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', opacity: 0.5, zIndex: -1 },
    goalLine: { flex: 1, height: 1, backgroundColor: COLORS.border, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
    goalLineLabel: { fontSize: 10, color: COLORS.text.muted, marginLeft: 8 },

    dayCol: { alignItems: 'center', width: 30, height: '100%', justifyContent: 'flex-end' },
    barTrack: { width: 8, height: '80%', backgroundColor: '#f3f4f6', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', borderRadius: 4, minHeight: 4 },

    dayLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text.muted },

    // Reminders
    reminderCard: { padding: 8 },
    reminderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    reminderLabel: { flexDirection: 'row', alignItems: 'center' },
    reminderText: { marginLeft: 12, fontSize: 15, fontWeight: '500' },
    switch: {
        width: 40, height: 22, borderRadius: 11,
        backgroundColor: COLORS.primary, justifyContent: 'center',
        paddingHorizontal: 3, alignItems: 'flex-end'
    },
    switchDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },

    // Sign Out
    signOutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 14,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: '#fee2e2',
        marginBottom: 20,
        ...SHADOWS.soft
    },
    signOutText: { color: COLORS.accent.high, fontWeight: '700', marginLeft: 10, fontSize: 15 },

    // Theme Selection
    themeCard: { padding: 0, overflow: 'hidden' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '85%', padding: 24, borderRadius: 24, alignItems: 'center', ...SHADOWS.medium },
    modalStatsRow: { flexDirection: 'row', width: '100%', marginBottom: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
    modalStatItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    closeBtn: {
        backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: RADIUS.full, ...SHADOWS.soft
    }
});
