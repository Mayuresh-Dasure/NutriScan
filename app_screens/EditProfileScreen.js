import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, TextInput, TouchableOpacity, View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '../components/Card';
import { GradientButton } from '../components/GradientButton';
import { Body, Heading, Label } from '../components/Typography';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';

const DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];

export default function EditProfileScreen({ route, navigation }) {
    const { colors, isDark } = useTheme();
    const { currentData } = route.params || {};

    const [name, setName] = useState(currentData?.username || '');
    const [age, setAge] = useState(currentData?.age || '');
    const [diet, setDiet] = useState(currentData?.diet || []); // Array
    const [profilePic, setProfilePic] = useState(currentData?.profilePic || null);

    // Nutrition Targets
    const [calories, setCalories] = useState(currentData?.calculatedLimits?.calories?.toString() || '2000');
    const [protein, setProtein] = useState(currentData?.calculatedLimits?.protein?.toString() || '100');
    const [water, setWater] = useState(currentData?.calculatedLimits?.water?.toString() || '3.0');

    const [saving, setSaving] = useState(false);

    const pickImage = async () => {
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
            }
        } catch (error) {
            Alert.alert('Error', 'Could not pick image');
        }
    };

    const handleDietToggle = (type) => {
        let newDiets;
        // Ensure diet is treated as array
        const currentDiets = Array.isArray(diet) ? diet : [diet].filter(Boolean);

        if (currentDiets.includes(type)) {
            newDiets = currentDiets.filter(d => d !== type);
        } else {
            newDiets = [...currentDiets, type];
        }
        setDiet(newDiets);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter your name.');
            return;
        }

        const calValue = parseInt(calories) || 0;
        if (calValue < 1200) {
            Alert.alert('Unsafe Target', 'Minimum daily calories should be 1200.');
            return;
        }

        setSaving(true);
        const user = auth.currentUser;
        if (user) {
            try {
                const updates = {
                    username: name.trim(),
                    age: parseInt(age) || 0,
                    diet: diet,
                    profilePic: profilePic,
                    calculatedLimits: {
                        calories: parseInt(calories) || 0,
                        protein: parseInt(protein) || 0,
                        water: parseFloat(water) || 0
                    }
                };

                await update(ref(database, `users/${user.uid}/settings`), updates);
                Alert.alert('Success', 'Profile updated successfully!');
                navigation.goBack();
            } catch (error) {
                console.error(error);
                Alert.alert('Error', 'Failed to update profile.');
            }
        }
        setSaving(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Heading level={2}>Edit Profile</Heading>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Avatar Edit */}
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                        {profilePic ? (
                            <Image source={{ uri: profilePic }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholder]}>
                                <Heading level={1} style={{ color: COLORS.primary }}>{name?.[0] || 'U'}</Heading>
                            </View>
                        )}
                        <View style={styles.cameraBadge}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Label style={{ marginTop: 8, color: COLORS.primary }}>Change Photo</Label>
                </View>

                {/* Personal Info */}
                <View style={styles.section}>
                    <Heading level={3} style={styles.sectionTitle}>Personal Details</Heading>
                    <Card style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Label>Name <Label style={{ color: COLORS.accent.high }}>*</Label></Label>
                            <TextInput
                                style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor={colors.text.muted}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Label>Age</Label>
                            <TextInput
                                style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                                value={age.toString()}
                                onChangeText={setAge}
                                keyboardType="numeric"
                                placeholder="Age"
                                placeholderTextColor={colors.text.muted}
                            />
                        </View>
                    </Card>
                </View>

                {/* Dietary Preferences */}
                <View style={styles.section}>
                    <Heading level={3} style={styles.sectionTitle}>Dietary Preferences</Heading>
                    <Card style={styles.card}>
                        <View style={styles.dietGrid}>
                            {DIET_TYPES.map(type => {
                                const currentDiets = Array.isArray(diet) ? diet : [diet].filter(Boolean);
                                const isSelected = currentDiets.includes(type);
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.dietChip,
                                            { borderColor: isSelected ? COLORS.primary : colors.border, backgroundColor: isSelected ? COLORS.primary : colors.surface }
                                        ]}
                                        onPress={() => handleDietToggle(type)}
                                    >
                                        <MaterialIcons
                                            name={type === 'Vegetarian' ? 'spa' : 'restaurant'}
                                            size={16}
                                            color={isSelected ? '#fff' : colors.text.secondary}
                                        />
                                        <Body style={[styles.dietText, { color: isSelected ? '#fff' : colors.text.secondary }]}>{type}</Body>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Card>
                </View>

                {/* Nutrition Targets */}
                <View style={styles.section}>
                    <Heading level={3} style={styles.sectionTitle}>Daily Targets</Heading>
                    <Card style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Label>Calories</Label>
                                <TextInput
                                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                                    value={calories}
                                    onChangeText={setCalories}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.col}>
                                <Label>Protein (g)</Label>
                                <TextInput
                                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                                    value={protein}
                                    onChangeText={setProtein}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.col}>
                                <Label>Water (L)</Label>
                                <TextInput
                                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                                    value={water}
                                    onChangeText={setWater}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </Card>
                </View>

                <GradientButton
                    title="Save Changes"
                    onPress={handleSave}
                    loading={saving}
                    style={{ marginTop: SPACING.md, marginBottom: 40 }}
                />

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft
    },
    content: { padding: SPACING.lg },
    section: { marginBottom: SPACING.lg },
    sectionTitle: { marginBottom: SPACING.sm, fontSize: 16, fontWeight: '700' },
    card: { padding: SPACING.md },
    inputGroup: { marginBottom: 12 },
    input: {
        borderWidth: 1, borderRadius: RADIUS.md,
        padding: 12, fontSize: 16, marginTop: 6,
        backgroundColor: 'rgba(0,0,0,0.02)'
    },
    dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dietChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: RADIUS.full, borderWidth: 1
    },
    dietText: { fontWeight: '600', fontSize: 13 },
    row: { flexDirection: 'row', gap: 12 },
    col: { flex: 1 },

    // Avatar Styles
    avatarContainer: { position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: COLORS.border },
    placeholder: { justifyContent: 'center', alignItems: 'center' },
    cameraBadge: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff'
    }
});
