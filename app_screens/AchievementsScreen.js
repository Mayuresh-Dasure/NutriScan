import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Achievement } from '../components/Badges';
import { Body, Heading } from '../components/Typography';
import { ACHIEVEMENTS } from '../constants/Achievements';
import { SHADOWS, SPACING } from '../constants/theme';
import { auth } from '../services/firebaseConfig';
import { getHabitStats } from '../services/habitService';

import { useTheme } from '../context/ThemeContext';

export default function AchievementsScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const load = async () => {
            const user = auth.currentUser;
            if (user) {
                const s = await getHabitStats(user.uid);
                setStats(s);
            }
        };
        load();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Heading level={2}>Achievements</Heading>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
                <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                    <Ionicons name="trophy" size={48} color="#f1c40f" />
                    <Heading level={2} style={{ marginTop: 12 }}>Level Up Your Health</Heading>
                    <Body muted style={{ textAlign: 'center', marginTop: 4 }}>Complete daily goals to unlock exclusive badges.</Body>
                </View>

                <Heading level={3} style={{ marginBottom: SPACING.md, marginTop: SPACING.xl }}>Your Badges</Heading>
                {ACHIEVEMENTS.map(ach => {
                    const isUnlocked = stats ? ach.requirement(stats) : false;
                    return (
                        <Achievement
                            key={ach.id}
                            title={ach.title}
                            description={ach.description}
                            icon={ach.icon}
                            unlocked={isUnlocked}
                        />
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
        flexDirection: 'row', alignItems: 'center', gap: 12
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft },
    infoCard: { alignItems: 'center', padding: SPACING.xl, borderRadius: 20, ...SHADOWS.soft }
});
