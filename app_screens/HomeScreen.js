import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { get, ref } from 'firebase/database';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Card } from '../components/Card';
import { ProgressRing } from '../components/Progress';
import { Body, Heading, Label } from '../components/Typography';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';
import { getHabitStats } from '../services/habitService';

export default function HomeScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [username, setUsername] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [habitStats, setHabitStats] = useState({ currentStreak: 0, totalScans: 0 });
    const [summary, setSummary] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0 });
    const [limits, setLimits] = useState({ calories: 2500, protein: 120, carbohydrates: 300, fat: 80, fiber: 30 });

    useFocusEffect(React.useCallback(() => {
        loadData();
    }, []));

    const loadData = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Fetch username, image, and limits
            const settingsSnap = await get(ref(database, `users/${user.uid}/settings`));
            if (settingsSnap.exists()) {
                const data = settingsSnap.val();
                if (data.username) setUsername(data.username);
                if (data.profileImage) setProfileImage(data.profileImage);
                if (data.calculatedLimits) setLimits({ ...limits, ...data.calculatedLimits });
            }

            // Fetch habit stats
            const hStats = await getHabitStats(user.uid);
            setHabitStats(hStats);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.getTime();

            // Fetch today's food logs
            const logsRef = ref(database, `users/${user.uid}/foodLogs`);
            const logsSnap = await get(logsRef);
            let totalCal = 0;
            let totalProt = 0;
            let totalCarbs = 0;
            let totalFat = 0;
            let totalFiber = 0;

            if (logsSnap.exists()) {
                const logs = logsSnap.val();
                Object.values(logs).forEach(log => {
                    // Check for today totals (Start of day to End of day)
                    // limit to entries strictly for today to avoid future logs appearing
                    if (log.timestamp >= todayStart && log.timestamp < todayStart + 86400000) {
                        totalCal += parseFloat(log.calories) || 0;
                        totalProt += parseFloat(log.protein) || 0;
                        totalCarbs += parseFloat(log.carbohydrates) || 0;
                        totalFat += parseFloat(log.totalFat) || 0;
                        totalFiber += parseFloat(log.fiber) || 0;
                    }
                });
            }

            setSummary({
                totalCalories: Math.round(totalCal),
                totalProtein: Math.round(totalProt),
                totalCarbs: Math.round(totalCarbs),
                totalFat: Math.round(totalFat),
                totalFiber: Math.round(totalFiber)
            });

        } catch (err) {
            console.log("Error loading Home data", err);
        }
    };

    const MacroRing = ({ label, current, target, color }) => {
        const progress = Math.min((current / target) * 100, 100);
        return (
            <View style={{ alignItems: 'center' }}>
                <ProgressRing
                    progress={progress}
                    size={60}
                    strokeWidth={5}
                    color={color}
                    bgColor="rgba(255,255,255,0.1)"
                    hideLegend
                />
                <View style={{ marginTop: 8, alignItems: 'center' }}>
                    <Label style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Label>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 }}>{current}<Text style={{ fontSize: 10, color: '#64748b' }}>/{target}</Text></Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={styles.content}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.text.primary }]}>Hi, {username || 'There'}</Text>
                        {/* Daily Greeting */}
                        <Text style={[styles.subGreeting, { color: colors.text.muted }]}>Let's hit your goals today!</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={styles.streakContainer}>
                            <Ionicons name="flame" size={20} color="#f97316" />
                            <Text style={styles.streakText}>{habitStats.currentStreak}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Profile')}
                            style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: isDark ? '#334155' : '#f1f5f9',
                                justifyContent: 'center', alignItems: 'center',
                                borderWidth: 1, borderColor: isDark ? '#475569' : '#e2e8f0',
                                overflow: 'hidden'
                            }}
                        >
                            {profileImage ? (
                                <Image
                                    source={{ uri: profileImage }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Ionicons name="person" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Health Card */}
                <Card style={[styles.healthCard, { backgroundColor: '#0f172a' }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Health Progress</Text>
                        <View style={styles.todayBadge}>
                            <Text style={styles.todayText}>TODAY</Text>
                        </View>
                    </View>

                    <View style={styles.ringsContainer}>
                        {/* Calories - Dominant */}
                        <View style={styles.mainRingWrapper}>
                            <ProgressRing
                                progress={Math.min((summary.totalCalories / limits.calories) * 100, 100)}
                                size={120}
                                strokeWidth={10}
                                color={colors.primary}
                                bgColor="rgba(255,255,255,0.1)"
                                hideLegend
                            />
                            <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 2, letterSpacing: 0.5 }}>CALORIES</Text>
                                <Text style={styles.calText}>{summary.totalCalories}</Text>
                                <Text style={styles.calTarget}>/ {limits.calories}</Text>
                            </View>
                        </View>

                        {/* Macros */}
                        <View style={styles.macrosRow}>
                            <MacroRing label="PROTEIN" current={summary.totalProtein} target={limits.protein} color="#f97316" />
                            <MacroRing label="CARBS" current={summary.totalCarbs} target={limits.carbohydrates} color="#3b82f6" />
                            <MacroRing label="FIBRE" current={summary.totalFiber} target={limits.fiber || 30} color="#22c55e" />
                        </View>
                    </View>
                </Card>

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                    {/* Quick Scan */}
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}
                        onPress={() => navigation.navigate('Scan')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Ionicons name="scan" size={24} color="#10b981" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.actionTitle, { color: colors.text.primary }]}>Quick Scan</Text>
                            <Text style={styles.actionDesc}>Decode any label instantly</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>

                    {/* My Diary */}
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}
                        onPress={() => navigation.navigate('Diary')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                            <Ionicons name="journal" size={24} color="#3b82f6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.actionTitle, { color: colors.text.primary }]}>My Journal</Text>
                            <Text style={styles.actionDesc}>Review your recent intake</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>

                {/* Pro Tip - Lighter Style */}
                <View style={[styles.tipCard, { backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <FontAwesome5 name="lightbulb" size={18} color="#10b981" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tipTitle}>Pro Tip:</Text>
                            <Text style={styles.tipText}>Always check for hidden sugars in processed foods by scanning the full ingredients list.</Text>
                        </View>
                    </View>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 20, paddingTop: 60, paddingBottom: 20, justifyContent: 'space-between' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting: { fontSize: 24, fontWeight: '800' },
    subGreeting: { fontSize: 13, marginTop: 2 },
    streakContainer: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.2)'
    },
    streakText: { color: '#f97316', fontWeight: '800', fontSize: 14 },

    // Health Card
    healthCard: { padding: 24, borderRadius: 30, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    todayBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    todayText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

    ringsContainer: { alignItems: 'center', gap: 24 },
    mainRingWrapper: { justifyContent: 'center', alignItems: 'center', height: 130 },
    calText: { color: '#fff', fontSize: 24, fontWeight: '800' },
    calTarget: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

    macrosRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 },

    // Actions
    actionsContainer: { gap: 12, marginBottom: 24 },
    actionCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, gap: 16,
        ...SHADOWS.soft
    },
    iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    actionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    actionDesc: { color: '#94a3b8', fontSize: 12 },

    // Pro Tip
    tipCard: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
    tipTitle: { color: '#10b981', fontWeight: '700', fontSize: 14, marginBottom: 4 },
    tipText: { color: '#64748b', fontSize: 13, lineHeight: 20 }
});
