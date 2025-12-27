import { Ionicons } from '@expo/vector-icons';
import { push, ref, update } from 'firebase/database';
import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { GradientButton } from '../components/GradientButton';
import { Body, Heading, Label } from '../components/Typography';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';

const CATEGORIES = ['Meal', 'Snack', 'Drink'];
const DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];
// Simplified for this screen, maybe just Veg/Non-Veg is enough for now based on user request "Category", 
// but sticking to "Vegetarian" status is good for consistency. 
// Let's use the requested "Category" as meal type, and maybe a toggle for Veg.

export default function ManualEntryScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbohydrates, setCarbohydrates] = useState('');
    const [isVeg, setIsVeg] = useState('Vegetarian'); // Default string
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (loading) return;

        if (!name || !calories) {
            Alert.alert('Missing Details', 'Please enter at least a name and calories.');
            return;
        }

        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const newLogRef = push(ref(database, `users/${user.uid}/foodLogs`));
            await update(newLogRef, {
                productName: name,
                calories: parseInt(calories),
                protein: parseFloat(protein) || 0,
                carbohydrates: parseFloat(carbohydrates) || 0,
                vegetarianStatus: isVeg, // Save the string value directly ('Vegetarian', 'Vegan', etc.)
                timestamp: Date.now(),
                healthScore: 70, // Manual entries get a neutral/good score by default
                manual: true
            });

            // Alert.alert('Success', 'Food added to your log!');
            navigation.navigate('Diary', { toast: 'Saved to diary!' });
        } catch (error) {
            Alert.alert('Error', 'Failed to save entry.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.inner, { backgroundColor: colors.background }]}>
                    <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface }]} activeOpacity={0.6}>
                            <Ionicons name="close" size={24} color={colors.text.primary} />
                        </TouchableOpacity>
                        <Heading level={2}>Add Food Manually</Heading>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>

                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Label style={styles.label}>Food Name</Label>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text.primary }]}
                                placeholder="e.g. Banana, Grilled Chicken"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor={colors.text.muted}
                            />
                        </View>

                        <View style={styles.row}>
                            {/* Calories Input */}
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Label style={styles.label}>Calories</Label>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text.primary }]}
                                    placeholder="0"
                                    value={calories}
                                    onChangeText={setCalories}
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.text.muted}
                                />
                            </View>

                            {/* Protein Input */}
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Label style={styles.label}>Protein (g)</Label>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text.primary }]}
                                    placeholder="0"
                                    value={protein}
                                    onChangeText={setProtein}
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.text.muted}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            {/* Carbohydrates Input */}
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Label style={styles.label}>Carbs (g)</Label>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text.primary }]}
                                    placeholder="0"
                                    value={carbohydrates}
                                    onChangeText={setCarbohydrates}
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.text.muted}
                                />
                            </View>

                            {/* Empty space for symmetry */}
                            <View style={{ flex: 1 }} />
                        </View>

                        {/* Diet Type Selection */}
                        <View style={styles.inputGroup}>
                            <Label style={styles.label}>Dietary Type</Label>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {DIET_TYPES.map((type) => {
                                    const isSelected = isVeg === type;
                                    // Use 'isVeg' as the state variable name for consistency with existing code, 
                                    // but treating it as a string now. 
                                    // Actually, let's rename the state variable in the next step or just accept 'isVeg' as string state.
                                    // To minimize diff noise, I will keep the state name 'isVeg' but initialize it differently and use it as string.
                                    return (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.toggleBtn,
                                                {
                                                    backgroundColor: isSelected ? colors.primary : colors.surface,
                                                    borderColor: isSelected ? colors.primary : colors.border,
                                                    flex: 0, paddingHorizontal: 16
                                                }
                                            ]}
                                            onPress={() => setIsVeg(type)}
                                        >
                                            <Ionicons
                                                name={type === 'Vegetarian' ? 'leaf' : type === 'Vegan' ? 'nutrition' : type === 'Eggetarian' ? 'ellipse-outline' : 'restaurant'}
                                                size={16}
                                                color={isSelected ? '#fff' : colors.primary}
                                            />
                                            <Body style={[styles.toggleText, isSelected && styles.toggleTextActive]}>{type}</Body>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                    </ScrollView>

                    {/* Footer Action */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <GradientButton
                            title="Add to Log"
                            onPress={handleSave}
                            loading={loading}
                        />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    inner: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingTop: 60,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center', alignItems: 'center'
    },
    content: { padding: SPACING.lg },
    inputGroup: { marginBottom: SPACING.xl },
    label: { marginBottom: 8, color: COLORS.text.secondary },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: 16,
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text.primary
    },
    row: { flexDirection: 'row', gap: 16 },

    toggleRow: { flexDirection: 'row', gap: 12 },
    toggleBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: '#fff',
        borderWidth: 1, borderColor: COLORS.border, gap: 8, ...SHADOWS.soft
    },
    toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    toggleText: { fontWeight: '600', fontSize: 14, color: COLORS.text.secondary },
    toggleTextActive: { color: "#fff" },

    footer: {
        padding: SPACING.lg,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'transparent', // Handled invalid ref manually, changing to dynamic style inline might be better or passing here.
        // Actually, footer borderTopColor logic isn't easily passed via StyleSheet. 
        // I'll update the borderTopColor in Render view style overrides.
    }
});
