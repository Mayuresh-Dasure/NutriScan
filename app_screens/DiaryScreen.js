import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { get, push, ref, remove } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { Card } from '../components/Card';
import { ProgressBar } from '../components/Progress';
import { Body, Heading, Label } from '../components/Typography';
import { SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';

const MEAL_TIMES = {
    BREAKFAST: { start: 5, end: 11, label: 'Breakfast' },
    LUNCH: { start: 11, end: 16, label: 'Lunch' },
    DINNER: { start: 16, end: 22, label: 'Dinner' },
    SNACK: { start: 0, end: 24, label: 'Snacks' } // Fallback
};

export default function DiaryScreen({ navigation, route }) {
    const { colors, isDark } = useTheme();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [groupedLogs, setGroupedLogs] = useState({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
    const [summary, setSummary] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalWater: 0 });
    const [limits, setLimits] = useState({ calories: 2000, protein: 120, carbohydrates: 250, fat: 80, water: 3, fiber: 30 });
    const [waterModalVisible, setWaterModalVisible] = useState(false);
    const [waterInput, setWaterInput] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const slideAnim = useSlideAnimation(waterModalVisible);

    useEffect(() => {
        if (waterModalVisible) {
            setIsMounted(true);
        } else {
            const timer = setTimeout(() => setIsMounted(false), 300);
            return () => clearTimeout(timer);
        }
    }, [waterModalVisible]);

    // Generic Toast State
    const [toast, setToast] = useState({ visible: false, message: '', action: null, onAction: null });
    // const [deletedLog, setDeletedLog] = useState(null); // Removed for undo fix

    useFocusEffect(React.useCallback(() => {
        loadData(selectedDate);

        if (route.params?.toast) {
            showToast(route.params.toast);
            navigation.setParams({ toast: undefined });
        }
    }, [selectedDate, route.params?.toast]));

    const showToast = (message, action = null, onAction = null) => {
        setToast({ visible: true, message, action, onAction });
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 4000);
    };

    const loadData = async (date) => {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            const settingsSnap = await get(ref(database, `users/${user.uid}/settings`));
            if (settingsSnap.exists()) {
                const s = settingsSnap.val();
                if (s.calculatedLimits) setLimits({ ...limits, ...s.calculatedLimits });
            }
        } catch (e) { console.log(e); }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const logsRef = ref(database, `users/${user.uid}/foodLogs`);
        const snap = await get(logsRef);

        let dayLogs = [];
        let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;

        if (snap.exists()) {
            const data = snap.val();
            Object.keys(data).forEach(key => {
                const log = data[key];
                if (log.timestamp >= startOfDay.getTime() && log.timestamp <= endOfDay.getTime()) {
                    dayLogs.push({ id: key, ...log });
                    totalCal += (parseFloat(log.calories) || 0);
                    totalProt += (parseFloat(log.protein) || 0);
                    totalCarbs += (parseFloat(log.carbohydrates) || 0);
                    totalFat += (parseFloat(log.totalFat) || 0);
                }
            });
        }

        const groups = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
        dayLogs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            if (hour >= MEAL_TIMES.BREAKFAST.start && hour < MEAL_TIMES.BREAKFAST.end) groups.Breakfast.push(log);
            else if (hour >= MEAL_TIMES.LUNCH.start && hour < MEAL_TIMES.LUNCH.end) groups.Lunch.push(log);
            else if (hour >= MEAL_TIMES.DINNER.start && hour < MEAL_TIMES.DINNER.end) groups.Dinner.push(log);
            else groups.Snacks.push(log);
        });

        setLogs(dayLogs);
        setGroupedLogs(groups);

        const waterRef = ref(database, `users/${user.uid}/waterLogs`);
        const waterSnap = await get(waterRef);
        let totalWater = 0;
        if (waterSnap.exists()) {
            Object.values(waterSnap.val()).forEach(w => {
                if (w.timestamp >= startOfDay.getTime() && w.timestamp <= endOfDay.getTime()) {
                    totalWater += parseFloat(w.amount);
                }
            });
        }

        setSummary({
            totalCalories: Math.round(totalCal),
            totalProtein: Math.round(totalProt),
            totalCarbs: Math.round(totalCarbs),
            totalFat: Math.round(totalFat),
            totalWater: Math.round(totalWater * 10) / 10
        });

        setLoading(false);
    };

    const handleAddWater = () => {
        setWaterInput('');
        setWaterModalVisible(true);
    };

    const confirmAddWater = async () => {
        const amount = parseFloat(waterInput);
        if (!amount || isNaN(amount)) return;

        const user = auth.currentUser;
        if (user) {
            const waterRef = ref(database, `users/${user.uid}/waterLogs`);
            await push(waterRef, {
                amount,
                timestamp: Date.now()
            });
            await loadData(selectedDate);
            setWaterModalVisible(false);
            showToast("Water added");
        }
    };

    const deleteLog = async (id) => {
        const logToDelete = logs.find(l => l.id === id);
        if (!logToDelete) return;

        const user = auth.currentUser;
        if (user) {
            await remove(ref(database, `users/${user.uid}/foodLogs/${id}`));
            await loadData(selectedDate);
            showToast("Item deleted", "UNDO", () => handleUndo(logToDelete));
        }
    };

    const handleUndo = async (logToRestore) => {
        if (!logToRestore) return;
        setToast(prev => ({ ...prev, visible: false }));

        const user = auth.currentUser;
        if (user) {
            const { id, ...data } = logToRestore;
            await push(ref(database, `users/${user.uid}/foodLogs`), data);
            await loadData(selectedDate);
            showToast("Item restored");
        }
    };

    const groupDuplicates = (items) => {
        const grouped = [];
        items.forEach(item => {
            const index = grouped.findIndex(g => g.productName === item.productName && Math.abs(g.calories - item.calories) < 5);
            if (index > -1) {
                grouped[index].count += 1;
                grouped[index].totalCalories += item.calories;
                grouped[index].ids.push(item.id);
            } else {
                grouped.push({
                    ...item,
                    count: 1,
                    totalCalories: item.calories,
                    ids: [item.id]
                });
            }
        });
        return grouped;
    };

    const getDailyInsight = () => {
        if (logs.length === 0) return null;
        if (summary.totalCalories > limits.calories * 1.1) return { text: "You've exceeded your goal. Try a lighter meal next.", color: '#ef4444', icon: 'warning' };
        if (summary.totalProtein < limits.protein * 0.5 && summary.totalCalories > limits.calories * 0.5) return { text: "Protein is lagging. Prioritize protein in your next meal.", color: '#f59e0b', icon: 'fitness-center' };
        if (summary.totalWater < limits.water / 2 && new Date().getHours() > 14) return { text: "Hydration check! Grab a glass of water.", color: '#3b82f6', icon: 'local-drink' };
        if (summary.totalCalories > 0) return { text: "You're doing great! Keep tracking.", color: '#10b981', icon: 'thumb-up' };
        return null;
    };

    const insight = getDailyInsight();
    const waterProgress = Math.min(summary.totalWater / limits.water, 1);

    const renderMealGroup = (title, rawItems) => {
        if (!rawItems || rawItems.length === 0) return null;

        const items = groupDuplicates(rawItems);
        const groupCals = rawItems.reduce((acc, curr) => acc + (parseFloat(curr.calories) || 0), 0);

        const NutrientItem = ({ label, value, color }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 4 }} />
                <Label style={{ fontSize: 11, color: colors.text.muted }}>{label}: {value}</Label>
            </View>
        );

        return (
            <View style={styles.mealGroup} key={title}>
                <View style={styles.groupHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Heading level={3} style={{ color: colors.text.primary, fontSize: 18 }}>{title}</Heading>
                        <View style={{ backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Label style={{ fontSize: 10, color: colors.text.muted }}>{rawItems.length}</Label>
                        </View>
                    </View>
                    <Label style={{ color: colors.text.secondary, fontWeight: '600' }}>{Math.round(groupCals)} kcal</Label>
                </View>

                {items.map((item, index) => (
                    <Swipeable
                        key={`${item.ids[0]}_${index}`} // Unique key
                        renderRightActions={(progress, dragX) => {
                            const scale = dragX.interpolate({
                                inputRange: [-100, 0],
                                outputRange: [1, 0],
                                extrapolate: 'clamp',
                            });
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.6}
                                    onPress={() => deleteLog(item.ids[item.ids.length - 1])}
                                    style={styles.deleteAction}
                                >
                                    <Animated.View style={{ transform: [{ scale }] }}>
                                        <Ionicons name="trash-outline" size={24} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 }}>Delete</Text>
                                    </Animated.View>
                                </TouchableOpacity>
                            );
                        }}
                    >
                        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Result', { logData: item })}>
                            <Card style={[styles.logCard, { backgroundColor: colors.surface }]}>
                                <View style={styles.cardContent}>
                                    {/* Left: Product Image Container */}
                                    <View style={[styles.thumbnailWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        {item.imageUri || item.imageUrl ? (
                                            <Image
                                                source={{ uri: item.imageUri || item.imageUrl }}
                                                style={[styles.thumbnail, { opacity: 0.95 }]}
                                                contentFit="cover"
                                                transition={300}
                                            />
                                        ) : (
                                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#1a262f' : '#f0fdf4', justifyContent: 'center', alignItems: 'center' }}>
                                                <MaterialIcons name="restaurant" size={22} color="#10b981" />
                                            </View>
                                        )}

                                        <View style={styles.scanBadge}>
                                            <MaterialIcons name="qr-code-scanner" size={10} color="#fff" style={{ opacity: 0.5 }} />
                                        </View>

                                        {item.count > 1 && (
                                            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                                                <Text style={styles.countText}>x{item.count}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Right: Info */}
                                    <View style={styles.infoContainer}>
                                        <View style={styles.infoHeader}>
                                            <Body style={{ fontWeight: '700', color: colors.text.primary, flex: 1, fontSize: 15 }} numberOfLines={1}>
                                                {item.productName}
                                            </Body>
                                            <Label style={{ fontSize: 10, color: colors.text.muted }}>
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Label>
                                        </View>

                                        <Label style={{ fontSize: 11, color: colors.text.secondary, marginBottom: 6 }}>
                                            {item.category || 'Food'} • {item.calories ? `${Math.round(item.totalCalories)} kcal` : item.usageCategory || 'General'}
                                        </Label>

                                        {item.category === 'Medicine' ? (
                                            <View style={styles.medicineTag}>
                                                <MaterialIcons name="medical-services" size={12} color={colors.primary} />
                                                <Label style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginLeft: 4 }} numberOfLines={1}>
                                                    {item.indication || 'Medical Log'}
                                                </Label>
                                            </View>
                                        ) : (
                                            <View style={styles.nutrientRow}>
                                                <NutrientItem label="P" value={`${item.protein}g`} color="#ef4444" />
                                                <NutrientItem label="C" value={`${item.carbohydrates}g`} color="#3b82f6" />
                                                <NutrientItem label="F" value={`${item.totalFat}g`} color="#f59e0b" />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    </Swipeable>
                ))}
            </View>
        );
    };

    const isToday = (d) => {
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    };

    const CalendarDate = ({ date, selected, onSelect }) => {
        const day = date.toLocaleDateString('en-US', { weekday: 'narrow' });
        const num = date.getDate();
        const active = selectedDate.getDate() === date.getDate() && selectedDate.getMonth() === date.getMonth();

        return (
            <TouchableOpacity
                style={[styles.dateItem, active && styles.dateItemActive, { backgroundColor: active ? colors.primary : colors.surface }]}
                onPress={() => onSelect(date)}
            >
                <Label style={{ color: active ? '#fff' : colors.text.muted, fontSize: 10, marginBottom: 2 }}>{day}</Label>
                <Body style={{ color: active ? '#fff' : colors.text.primary, fontWeight: '700' }}>{num}</Body>
                {/* Indicator dot if it's today */}
                {isToday(date) && !active && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
        );
    };

    const calendarDates = React.useMemo(() => {
        const dates = [];
        for (let i = 13; i >= 0; i--) { // Last 2 weeks
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d);
        }
        return dates;
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header & Calendar Strip */}
            <View style={[styles.calendarStrip, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {/* Nav Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ padding: 8, marginRight: 8, borderRadius: 20 }}
                            activeOpacity={0.6}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                        </TouchableOpacity>
                        <View>
                            <Heading level={2} style={{ fontSize: 20 }}>My Journal</Heading>
                            <Label style={{ color: colors.text.muted }}>
                                {isToday(selectedDate) ? "Today" : selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </Label>
                        </View>
                    </View>
                    {!isToday(selectedDate) && (
                        <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primary, borderRadius: 20 }}>
                            <Label style={{ color: '#fff', fontWeight: '700' }}>Jump to Today</Label>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md }}>
                    {calendarDates.map((d, i) => (
                        <CalendarDate key={i} date={d} selected={selectedDate} onSelect={setSelectedDate} colors={colors} />
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Insight Card - Only show if data exists */}
                {insight && logs.length > 0 && (
                    <View style={[styles.insightCard, { backgroundColor: `${insight.color}10`, borderColor: `${insight.color}30`, borderWidth: 1 }]}>
                        <MaterialIcons name={insight.icon} size={20} color={insight.color} />
                        <Body style={{ color: colors.text.primary, fontSize: 13, flex: 1, marginLeft: 8 }}>{insight.text}</Body>
                    </View>
                )}

                {/* Enhanced Water Tracker */}
                <Card style={[styles.waterCard, { backgroundColor: isDark ? '#1e3a8a20' : '#eff6ff', borderColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
                    <View style={{ width: '100%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ padding: 6, backgroundColor: '#3b82f6', borderRadius: 8 }}>
                                    <Ionicons name="water" size={16} color="#fff" />
                                </View>
                                <Body style={{ color: isDark ? '#93c5fd' : '#1e40af', fontWeight: '700' }}>Hydration</Body>
                            </View>
                            <TouchableOpacity style={styles.addWaterBtn} onPress={handleAddWater}>
                                <Ionicons name="add" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Label style={{ color: isDark ? '#bfdbfe' : '#3b82f6' }}>{summary.totalWater}L</Label>
                            <Label style={{ color: isDark ? '#60a5fa' : '#93c5fd' }}>Goal: {limits.water}L</Label>
                        </View>
                        <ProgressBar progress={waterProgress} color="#3b82f6" height={8} />
                        {waterProgress >= 1 && <Label style={{ color: '#10b981', marginTop: 4, fontSize: 10, fontWeight: '700' }}>Goal Met! 🎉</Label>}
                    </View>
                </Card>

                {/* Meals List */}
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
                ) : logs.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 40, padding: 32, opacity: 0.9 }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 }}>
                            <MaterialIcons name="restaurant-menu" size={40} color={colors.primary} />
                        </View>
                        <Heading level={3} style={{ marginBottom: 8, color: colors.text.primary }}>Your plate is empty</Heading>
                        <Body style={{ textAlign: 'center', color: colors.text.secondary, marginBottom: 24 }}>
                            Start tracking your meals to unlock nutritional insights and hit your goals!
                        </Body>
                    </View>
                ) : (
                    <View style={{ paddingBottom: 100 }}>
                        {renderMealGroup('Breakfast', groupedLogs.Breakfast)}
                        {renderMealGroup('Lunch', groupedLogs.Lunch)}
                        {renderMealGroup('Dinner', groupedLogs.Dinner)}
                        {renderMealGroup('Snacks', groupedLogs.Snacks)}
                    </View>
                )}

            </ScrollView>

            {/* Persistent Log Meal Button (Only for Today) */}
            {isToday(selectedDate) && !loading && (
                <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.ctaButton, { backgroundColor: colors.primary, ...SHADOWS.medium }]}
                        onPress={() => navigation.navigate('ManualEntry')}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                            {logs.length === 0 ? "Log Your First Meal" : "Log Another Meal"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Generic Toast Notification */}
            {toast.visible && (
                <View style={styles.undoToast}>
                    <Text style={styles.undoText}>{toast.message}</Text>
                    {toast.action && (
                        <TouchableOpacity onPress={toast.onAction}>
                            <Text style={[styles.undoAction, { color: colors.primary }]}>{toast.action}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Animated Bottom Sheet for Water */}
            {isMounted && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
                    {/* Backdrop */}
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                        activeOpacity={1}
                        onPress={() => setWaterModalVisible(false)}
                    />

                    {/* Sheet */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
                        pointerEvents="box-none"
                    >
                        <Animated.View
                            style={[
                                styles.bottomSheet,
                                {
                                    backgroundColor: colors.surface,
                                    transform: [{
                                        translateY: slideAnim
                                    }]
                                }
                            ]}
                        >
                            <Heading level={3} style={{ marginBottom: 16, textAlign: 'center' }}>Add Water</Heading>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.waterInput, { color: colors.text.primary, borderColor: colors.border }]}
                                    placeholder="0.5"
                                    placeholderTextColor={colors.text.muted}
                                    keyboardType="numeric"
                                    value={waterInput}
                                    onChangeText={setWaterInput}
                                    autoFocus
                                />
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary }}>Liters</Text>
                            </View>
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setWaterModalVisible(false)} style={styles.modalBtnCancel}>
                                    <Text style={{ color: colors.text.secondary, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={confirmAddWater} style={[styles.modalBtnAdd, { backgroundColor: colors.primary }]}>
                                    <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    calendarStrip: { paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1 },
    dateItem: {
        width: 50, height: 64, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 10, ...SHADOWS.soft
    },
    dateItemActive: { ...SHADOWS.medium },
    todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },

    scrollContent: { padding: SPACING.screen, paddingTop: 20, paddingBottom: 100 },

    insightCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: SPACING.lg, borderWidth: 1 },

    waterCard: { padding: SPACING.md, marginBottom: SPACING.xl, borderWidth: 1 },
    addWaterBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },

    mealGroup: { marginBottom: SPACING.lg },
    groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    logCard: { padding: 12, marginBottom: 16, borderRadius: 24, ...SHADOWS.medium },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    thumbnailWrapper: {
        width: 76,
        height: 76,
        borderRadius: 18,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        ...SHADOWS.soft
    },
    thumbnail: { width: '100%', height: '100%', borderRadius: 14 },
    scanBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.3)', padding: 2, borderRadius: 4 },
    countBadge: { position: 'absolute', top: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
    countText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    infoContainer: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
    infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
    nutrientRow: { flexDirection: 'row', marginTop: 4 },
    medicineTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },

    // Modal Styles -> Bottom Sheet Styles
    bottomSheet: {
        width: '100%',
        padding: 24, paddingBottom: 40,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        ...SHADOWS.medium
    },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' },
    waterInput: { fontSize: 32, fontWeight: '700', borderBottomWidth: 2, paddingVertical: 4, width: 100, textAlign: 'center' },
    modalActions: { flexDirection: 'row', width: '100%', gap: 12 },
    modalBtnCancel: { flex: 1, padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    modalBtnAdd: { flex: 1, padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    // Undo Toast
    undoToast: {
        position: 'absolute', bottom: 40, alignSelf: 'center',
        backgroundColor: '#333', borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14, width: '90%',
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
        zIndex: 110
    },
    undoText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    undoAction: { fontWeight: '800', fontSize: 14, marginLeft: 10 },

    // Persistent Footer
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
        elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 4
    },
    ctaButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 16,
    },
    deleteAction: {
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '85%', // Align with card height approx
        marginTop: 10, // Match card margin
        marginBottom: 10,
        borderRadius: 16,
        marginLeft: 8
    }
});

// Helper Hook for slide animation
function useSlideAnimation(visible) {
    const slideAnim = useRef(new Animated.Value(300)).current; // Start off-screen

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 15
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    return slideAnim;
}

const isToday = (d) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
};

const CalendarDate = ({ date, selected, onSelect, colors }) => {
    const day = date.toLocaleDateString('en-US', { weekday: 'narrow' });
    const num = date.getDate();
    const active = selected.getDate() === date.getDate() && selected.getMonth() === date.getMonth();

    return (
        <TouchableOpacity
            style={[styles.dateItem, active && styles.dateItemActive, { backgroundColor: active ? colors.primary : colors.surface }]}
            onPress={() => onSelect(date)}
        >
            <Label style={{ color: active ? '#fff' : colors.text.muted, fontSize: 10, marginBottom: 2 }}>{day}</Label>
            <Body style={{ color: active ? '#fff' : colors.text.primary, fontWeight: '700' }}>{num}</Body>
            {isToday(date) && !active && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
    );
};
