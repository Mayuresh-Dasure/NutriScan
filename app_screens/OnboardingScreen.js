import { MaterialIcons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Card } from '../components/Card';
import { GradientButton } from '../components/GradientButton';
import { Body, Heading, Label } from '../components/Typography';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';

const DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];
const HEALTH_GOALS = ['General Health', 'Weight Loss', 'Muscle Gain', 'Diabetes Control', 'Heart Health'];

export default function OnboardingScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [diet, setDiet] = useState(''); // Single selection
    const [goal, setGoal] = useState('');

    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [gender, setGender] = useState('Male');

    const [saving, setSaving] = useState(false);

    const handleDietSelect = (selectedDiet) => {
        setDiet(selectedDiet);
    };

    const calculateNeeds = () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseFloat(age);

        if (!w || !h || !a) return { calories: 2000, protein: 50 };

        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += (gender === 'Male' ? 5 : -161);
        let tdee = bmr * 1.2;

        let targetCalories = Math.round(tdee);
        let targetProtein = Math.round(w * 0.8);

        switch (goal) {
            case 'Weight Loss':
                targetCalories -= 500;
                targetProtein = Math.round(w * 1.5);
                break;
            case 'Muscle Gain':
                targetCalories += 300;
                targetProtein = Math.round(w * 1.8);
                break;
            case 'Heart Health':
            case 'Diabetes Control':
                targetProtein = Math.round(w * 1.0);
                break;
        }

        if (targetCalories < 1200) targetCalories = 1200;

        return { calories: targetCalories, protein: targetProtein };
    };

    const handleSave = async () => {
        if (!diet || !goal || !age || !weight || !height) {
            Alert.alert('Details Required', 'Please fill in all details correctly.');
            return;
        }

        setSaving(true);
        try {
            const user = auth.currentUser;
            const limits = calculateNeeds();

            if (user) {
                await update(ref(database, `users/${user.uid}/settings`), {
                    diet,
                    goal,
                    age,
                    weight,
                    height,
                    gender,
                    calculatedLimits: limits,
                    onboardingComplete: true
                });
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save preferences.');
        } finally {
            setSaving(false);
        }
    };

    const Option = ({ label, isSelected, onPress }) => (
        <TouchableOpacity
            style={[
                styles.option,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => onPress(label)}
        >
            <Body style={[styles.optionText, { color: isSelected ? '#fff' : colors.text.primary }]}>{label}</Body>
            {isSelected && <MaterialIcons name="done" size={20} color="#fff" />}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <Heading level={1}>Tailor Your Experience</Heading>
                <Body muted>We use these details to provide personalized health scores and nutrition targets.</Body>
            </View>

            <View style={styles.section}>
                <Heading level={3} style={styles.sectionTitle}>Physical Statistics</Heading>
                <Card style={styles.biometricsCard}>
                    <View style={styles.inputRow}>
                        <View style={styles.halfInput}>
                            <Label style={{ color: colors.text.secondary }}>Age</Label>
                            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text.primary }]} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="25" placeholderTextColor={colors.text.muted} />
                        </View>
                        <View style={styles.halfInput}>
                            <Label style={{ color: colors.text.secondary }}>Gender</Label>
                            <TouchableOpacity style={[styles.genderToggle, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setGender(gender === 'Male' ? 'Female' : 'Male')}>
                                <Body style={[styles.genderText, { color: colors.text.primary }]}>{gender}</Body>
                                <MaterialIcons name={gender === 'Male' ? 'male' : 'female'} size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputRow}>
                        <View style={styles.halfInput}>
                            <Label style={{ color: colors.text.secondary }}>Weight (kg)</Label>
                            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text.primary }]} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="70" placeholderTextColor={colors.text.muted} />
                        </View>
                        <View style={styles.halfInput}>
                            <Label style={{ color: colors.text.secondary }}>Height (cm)</Label>
                            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text.primary }]} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="175" placeholderTextColor={colors.text.muted} />
                        </View>
                    </View>
                </Card>
            </View>

            <View style={styles.section}>
                <Heading level={3} style={styles.sectionTitle}>Dietary Preferences</Heading>
                <View style={styles.optionsGrid}>
                    {DIET_TYPES.map(type => (
                        <Option
                            key={type}
                            label={type}
                            isSelected={diet === type}
                            onPress={handleDietSelect}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Heading level={3} style={styles.sectionTitle}>Primary Health Goal</Heading>
                <View style={styles.optionsGrid}>
                    {HEALTH_GOALS.map(hGoal => (
                        <Option
                            key={hGoal}
                            label={hGoal}
                            isSelected={goal === hGoal}
                            onPress={setGoal}
                        />
                    ))}
                </View>
            </View>

            <GradientButton
                title="Create My Profile"
                onPress={handleSave}
                loading={saving}
                style={{ marginTop: SPACING.xl, marginBottom: 40 }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: SPACING.lg, paddingTop: 80 },
    header: { marginBottom: SPACING.xl },
    section: { marginBottom: SPACING.xl },
    sectionTitle: { marginBottom: SPACING.md },
    biometricsCard: { padding: SPACING.md },
    optionsGrid: { gap: 10 },
    option: {
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.soft,
    },
    optionText: { fontWeight: '600' },
    inputRow: { flexDirection: 'row', gap: 16, marginBottom: SPACING.sm },
    halfInput: { flex: 1 },
    input: {
        padding: 14,
        borderRadius: RADIUS.md,
        fontSize: 16,
        fontWeight: '500',
        borderWidth: 1,
    },
    genderToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: RADIUS.md,
        borderWidth: 1,
    },
    genderText: { fontWeight: '500' }
});
