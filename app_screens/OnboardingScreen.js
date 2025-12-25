import { MaterialIcons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, database } from '../services/firebaseConfig';

const DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];
const HEALTH_GOALS = ['General Health', 'Weight Loss', 'Muscle Gain', 'Diabetes Control', 'Heart Health'];

export default function OnboardingScreen({ navigation }) {
    const [diet, setDiet] = useState([]);
    const [goal, setGoal] = useState('');

    // Personal Details
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [gender, setGender] = useState('Male');

    const [saving, setSaving] = useState(false);

    const handleDietSelect = (selectedDiet) => {
        if (diet.includes(selectedDiet)) {
            setDiet(diet.filter(d => d !== selectedDiet));
        } else {
            setDiet([...diet, selectedDiet]);
        }
    };

    const calculateNeeds = () => {
        // Mifflin-St Jeor Equation
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseFloat(age);

        if (!w || !h || !a) return { calories: 2000, protein: 50 }; // Fallback

        // BMR Calculation
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += (gender === 'Male' ? 5 : -161);

        // TDEE (Total Daily Energy Expenditure) - Assuming 'Sedentary' (1.2) for baseline safety
        let tdee = bmr * 1.2;

        let targetCalories = Math.round(tdee);
        let targetProtein = Math.round(w * 0.8); // 0.8g per kg baseline

        switch (goal) {
            case 'Weight Loss':
                targetCalories -= 500;
                targetProtein = Math.round(w * 1.5); // High protein for muscle retention
                break;
            case 'Muscle Gain':
                targetCalories += 300;
                targetProtein = Math.round(w * 1.8); // High protein for growth
                break;
            case 'Heart Health':
            case 'Diabetes Control':
                targetProtein = Math.round(w * 1.0);
                break;
        }

        // Safety caps
        if (targetCalories < 1200) targetCalories = 1200;

        return { calories: targetCalories, protein: targetProtein };
    };

    const handleSave = async () => {
        if (diet.length === 0 || !goal || !age || !weight || !height) {
            Alert.alert('Details Required', 'Please fill in all details correctly.');
            return;
        }

        if (isNaN(parseFloat(age)) || isNaN(parseFloat(weight)) || isNaN(parseFloat(height))) {
            Alert.alert('Invalid Input', 'Please enter valid numbers for age, weight, and height.');
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
                    calculatedLimits: limits
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
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onPress(label)}
        >
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{label}</Text>
            {isSelected && <MaterialIcons name="check-circle" size={20} color="#fff" />}
        </TouchableOpacity>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome!</Text>
                <Text style={styles.subtitle}>Help us analyze food labels better for you.</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About You</Text>
                <View style={styles.inputRow}>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput
                            style={styles.input}
                            value={age}
                            onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            placeholder="e.g 25"
                            maxLength={3}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Gender</Text>
                        <TouchableOpacity style={styles.genderToggle} onPress={() => setGender(gender === 'Male' ? 'Female' : 'Male')}>
                            <Text style={styles.genderText}>{gender}</Text>
                            <MaterialIcons name={gender === 'Male' ? 'male' : 'female'} size={20} color="#208091" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.inputRow}>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Weight (kg)</Text>
                        <TextInput
                            style={styles.input}
                            value={weight}
                            onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
                            keyboardType="numeric"
                            placeholder="e.g 70"
                            maxLength={5}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Height (cm)</Text>
                        <TextInput
                            style={styles.input}
                            value={height}
                            onChangeText={(t) => setHeight(t.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            placeholder="e.g 175"
                            maxLength={3}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dietary Preference (Select all)</Text>
                <View style={styles.optionsGrid}>
                    {DIET_TYPES.map(type => (
                        <Option
                            key={type}
                            label={type}
                            isSelected={diet.includes(type)}
                            onPress={handleDietSelect}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Primary Goal</Text>
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

            <TouchableOpacity style={styles.continueButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.continueButtonText}>Get Started</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#fff', padding: 24, paddingVertical: 60 },
    header: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#208091', marginBottom: 12 },
    optionsGrid: { gap: 12 },
    option: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#f9f9f9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    optionSelected: { backgroundColor: '#208091', borderColor: '#208091' },
    optionText: { fontSize: 16, color: '#444' },
    optionTextSelected: { color: '#fff', fontWeight: 'bold' },
    continueButton: {
        backgroundColor: '#208091',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 24, marginBottom: 24
    },
    continueButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    inputRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    halfInput: { flex: 1 },
    label: { fontSize: 13, color: '#666', marginBottom: 6 },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8, fontSize: 16 },
    genderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8 },
    genderText: { fontSize: 16, color: '#333' }
});
