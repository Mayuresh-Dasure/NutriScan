import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { Card } from './Card';
import { TrendsChart } from './TrendsChart';
import { Body, Heading, Label } from './Typography';

export const WeeklySummaryCard = ({ data = [], stats = {} }) => {
    return (
        <Card premium style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Heading level={2} inverse>Weekly Snapshot</Heading>
                    <Body inverse style={{ opacity: 0.8 }}>Your consistency is improving! 🚀</Body>
                </View>
                <View style={styles.badge}>
                    <Ionicons name="trending-up" size={16} color={COLORS.primary} />
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <Label inverse>AVG CALS</Label>
                    <Heading level={3} inverse>{stats.avgCalories || 0}</Heading>
                </View>
                <View style={styles.statItem}>
                    <Label inverse>LOGGED DAYS</Label>
                    <Heading level={3} inverse>{stats.loggedDays || 0}/7</Heading>
                </View>
                <View style={styles.statItem}>
                    <Label inverse>BEST GOAL</Label>
                    <Heading level={3} inverse>{stats.bestGoal || 'Protein'}</Heading>
                </View>
            </View>

            <View style={styles.divider} />

            <TrendsChart
                data={data}
                title=""
                color="#fff"
                transparent
                labelColor="#fff"
            />
        </Card>
    );
};

const styles = StyleSheet.create({
    container: { padding: SPACING.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
    badge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },
    statItem: { flex: 1 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: SPACING.md }
});
