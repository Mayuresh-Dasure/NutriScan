import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { get, push, ref, remove, serverTimestamp, update } from 'firebase/database';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing
} from 'react-native';
import { Badge } from '../components/Badges';
import { Card } from '../components/Card';
import { GradientButton } from '../components/GradientButton';
import { ProgressRing } from '../components/Progress';
import { Body, Heading, Label } from '../components/Typography';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { auth, database } from '../services/firebaseConfig';
import { analyzeImageWithGemini } from '../services/geminiService';
import { updateStreakAndAchievements } from '../services/habitService';
import { updateLogEntry } from '../services/logService';

export default function ResultScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [productName, setProductName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');

  // Animation State
  const [animatedScore, setAnimatedScore] = useState(0);

  const { imageUri, logData } = route.params || {};

  useEffect(() => {
    let target = 0;
    if (logData) {
      // History Mode
      const portions = logData.portions || 1;
      setAnalysis({ ...logData }); // Use raw data, we will compute display values dynamically
      setProductName(logData.productName || '');
      setNotes(logData.notes || '');
      setMultiplier(portions);
      target = logData.healthScore || 0;
    } else if (imageUri) {
      // Scan Mode - processing will handle analysis setting
      processImage(imageUri);
      return;
    }
    checkFavorite();

    // Animate Score for History Mode immediately
    if (logData) animateScore(target);

  }, [imageUri, logData]);

  // Clean animation helper
  const scoreInterval = useRef(null);

  const animateScore = (target) => {
    if (scoreInterval.current) clearInterval(scoreInterval.current);

    let current = 0;
    scoreInterval.current = setInterval(() => {
      if (current >= target) {
        if (scoreInterval.current) clearInterval(scoreInterval.current);
        setAnimatedScore(target);
      } else {
        current += 2;
        // Clamp to target
        if (current > target) current = target;
        setAnimatedScore(current);
      }
    }, 20);
  };

  useEffect(() => {
    return () => {
      if (scoreInterval.current) clearInterval(scoreInterval.current);
    };
  }, []);

  const checkFavorite = async () => {
    const user = auth.currentUser;
    if (user && productName) {
      const favRef = ref(database, `users/${user.uid}/favorites/${productName.replace(/[.#$[\]]/g, "")}`);
      const snap = await get(favRef);
      if (snap.exists()) setIsFavorite(true);
    }
  };

  const processImage = async (uri) => {
    setLoading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const user = auth.currentUser;
      let userProfile = { vegType: 'Vegetarian', goal: 'General Health' };

      if (user) {
        const snapshot = await get(ref(database, `users/${user.uid}/settings`));
        if (snapshot.exists()) {
          const s = snapshot.val();
          userProfile = {
            vegType: s.diet ? (Array.isArray(s.diet) ? s.diet.join(', ') : s.diet) : 'Vegetarian',
            goal: s.goal || 'General Health'
          };
        }
      }

      const data = await analyzeImageWithGemini(base64, userProfile);
      if (data) {
        setAnalysis(data);
        if (data.productName) setProductName(data.productName);
        animateScore(data.healthScore || 0);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not analyze image: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    const user = auth.currentUser;
    if (!user || !productName) return;

    const safeName = productName.replace(/[.#$[\]]/g, "");
    const favRef = ref(database, `users/${user.uid}/favorites/${safeName}`);

    if (isFavorite) {
      await remove(favRef);
      setIsFavorite(false);
    } else {
      await update(ref(database, `users/${user.uid}/favorites`), {
        [safeName]: { productName, calories: analysis.calories, protein: analysis.protein, timestamp: serverTimestamp() }
      });
      setIsFavorite(true);
    }
  };

  const saveToLog = async () => {
    if (loading) return;

    if (!analysis || !productName.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      const entryData = {
        productName,
        ...analysis,
        notes,
        portions: multiplier,
        // Recalculate totals based on multiplier for storage if needed, 
        // OR store base values and multiplier. 
        // Existing logic stored calculated values. Let's stick to that for consistency.
        calories: Math.round(analysis.calories * multiplier),
        protein: Math.round(analysis.protein * multiplier * 10) / 10,
        carbohydrates: Math.round((analysis.carbohydrates || 0) * multiplier * 10) / 10,
        totalFat: Math.round((analysis.totalFat || 0) * multiplier * 10) / 10,
      };

      if (isEditing && logData) {
        await updateLogEntry(user.uid, logData.id, entryData);
        Alert.alert("Updated", "Entry updated successfully");
        navigation.goBack();
      } else {
        const logsRef = ref(database, `users/${user.uid}/foodLogs`);
        const newLog = {
          timestamp: serverTimestamp(),
          imageUri: imageUri || null,
          ...entryData
        };
        await push(logsRef, newLog);
        await updateStreakAndAchievements(user.uid, newLog);

        // Alert.alert('Success', 'Saved to your diary!');
        navigation.navigate('Diary', { toast: 'Saved to diary!' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      // Small delay to prevent immediate re-press while navigating
      setTimeout(() => setLoading(false), 500);
    }
  };

  const adjustPortion = (delta) => {
    setMultiplier(prev => Math.max(0.5, Math.round((prev + delta) * 10) / 10));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    if (score >= 40) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  // Tips State
  const [loadingTip, setLoadingTip] = useState("Analyzing ingredients...");

  useEffect(() => {
    if (loading) {
      const tips = [
        "Did you know fiber keeps you full longer?",
        "Protein is essential for muscle repair.",
        "Hidden sugars often appear as 'Dextrose' or 'Syrup'.",
        "Checking nutritional values...",
        "Comparing against your specialized diet..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingTip(tips[i % tips.length]);
        i++;
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Heading level={2} style={styles.loadingText}>Analyzing Label...</Heading>
        <Body muted style={{ textAlign: 'center', maxWidth: 280, marginTop: 8, height: 40 }}>{loadingTip}</Body>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <MaterialIcons name="error-outline" size={48} color={colors.text.muted} />
        <Heading level={2} style={styles.loadingText}>No Data Found</Heading>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
          <Body style={{ color: '#fff', fontWeight: 'bold' }}>Go Back</Body>
        </TouchableOpacity>
      </View>
    );
  }

  const scoreColor = getScoreColor(analysis.healthScore);

  // Base values for display calculation
  // If we are in history mode, analysis already has the multipled values? 
  // Wait, in history mode line 46: baseCalories = logData.calories / portions.
  // So 'analysis' object holds BASE values (per 1 serving).
  // So we multiply by 'multiplier'.

  const calcVal = (val) => (val === null || val === undefined) ? null : Math.round(val * multiplier * 10) / 10;

  const displayCal = (analysis.calories === null || analysis.calories === undefined) ? null : Math.round(analysis.calories * multiplier);
  const displayProt = calcVal(analysis.protein);
  const displayCarbs = calcVal(analysis.carbohydrates);
  const displayFat = calcVal(analysis.totalFat);
  const displayFiber = calcVal(analysis.fiber);
  const displaySugar = calcVal(analysis.sugar?.labelSugar);

  const MacroItem = ({ label, value, unit, color }) => (
    <View style={[styles.macroItem, { backgroundColor: colors.surface }]}>
      <Heading level={2} style={{ color: value !== null ? (color || colors.text.primary) : colors.text.muted, textAlign: 'center' }}>
        {value !== null ? value : '--'}
      </Heading>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        {value !== null && <Label style={{ fontSize: 12 }}>{unit}</Label>}
        <Body muted style={{ fontSize: 12 }}>{label}</Body>
      </View>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero Section */}
        <ImageBackground source={{ uri: imageUri || logData?.imageUri }} style={styles.heroBackground}>
          <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']} style={styles.heroGradient}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.6}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {logData && (
                  <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={[styles.iconBtn, isEditing && { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="edit" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={toggleFavorite} style={styles.iconBtn}>
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={24}
                    color={isFavorite ? "#ff4757" : "#fff"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Card glass style={styles.scoreHeroCard}>
              {/* Animated Health Score */}
              <ProgressRing
                progress={animatedScore}
                size={110}
                strokeWidth={10}
                color={scoreColor}
                label="HEALTH"
              />
              <View style={styles.nameHeader}>
                <TextInput
                  style={[styles.nameInput, isEditing && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)' }]}
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="Product Name"
                  placeholderTextColor="#ccc"
                  editable={isEditing || !logData}
                />
              </View>
              <Badge label={analysis.vegetarianStatus} type={analysis.vegetarianStatus?.includes('Non') ? 'error' : 'success'} />
            </Card>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.contentContainer}>

          {/* Smart Suggestion (Alternatives Moved Up) */}
          {analysis.alternatives?.length > 0 && (
            <View style={styles.suggestionBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
                <Label style={{ color: colors.primary, fontWeight: '700' }}>SMART ALTERNATIVES</Label>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {analysis.alternatives.map((alt, i) => {
                  // Handle "Name : Reason" format
                  const parts = alt.split(':');
                  const name = parts[0].trim();
                  const reason = parts[1] ? parts[1].trim() : '';

                  return (
                    <View key={i} style={[styles.altChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Body style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{name}</Body>
                      {reason ? <Label style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>{reason}</Label> : null}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Portion Control (Stepper) */}
          <View style={styles.portionSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Heading level={3}>Portion Size</Heading>
            </View>
            <View style={[styles.stepperContainer, { backgroundColor: colors.inputBackground }]}>
              <TouchableOpacity onPress={() => adjustPortion(-0.5)} style={[styles.stepperBtn, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="remove" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Heading level={2} style={{ color: colors.primary }}>x{multiplier}</Heading>
                <Label muted style={{ marginTop: 2 }}>{analysis.servingDescription || 'Serving'}</Label>
              </View>
              <TouchableOpacity onPress={() => adjustPortion(0.5)} style={[styles.stepperBtn, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="add" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Macros 2x2 Grid */}
          <View style={styles.macrosGrid}>
            <MacroItem label="Calories" value={displayCal} unit="kcal" color={colors.text.primary} />
            <MacroItem label="Protein" value={displayProt} unit="g" color="#f97316" />
            <MacroItem label="Carbs" value={displayCarbs} unit="g" color="#3b82f6" />
            <MacroItem label="Fats" value={displayFat} unit="g" color="#eab308" />
          </View>

          {/* Detailed Stats Row */}
          <View style={[styles.detailsRow, { borderColor: colors.border }]}>
            <View style={{ alignItems: 'center' }}>
              <Label muted>Fiber</Label>
              <Body style={{ fontWeight: '600' }}>{displayFiber !== null ? `${displayFiber}g` : '--'}</Body>
            </View>
            <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Label muted>Sugar</Label>
              <Body style={{ fontWeight: '600' }}>{displaySugar !== null ? `${displaySugar}g` : '--'}</Body>
            </View>
            <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Label muted>Score</Label>
              <Body style={{ color: scoreColor, fontWeight: '800' }}>{analysis.healthScore ?? '?'}</Body>
            </View>
          </View>

          {/* Score Explanation */}
          {analysis.scoreExplanation && (
            <View style={{ marginBottom: SPACING.xl, padding: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: RADIUS.md, borderColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1 }}>
              <Label style={{ color: COLORS.primary, fontWeight: '700', marginBottom: 4 }}>Why this score?</Label>
              <Body style={{ fontSize: 13, color: colors.text.primary, lineHeight: 20 }}>{analysis.scoreExplanation}</Body>
            </View>
          )}

          {/* AI Verdict */}
          <Card style={styles.verdictCard}>
            <View style={styles.verdictHeader}>
              <MaterialIcons name="analytics" size={18} color={colors.primary} />
              <Heading level={3}>AI Verdict</Heading>
            </View>
            <Body style={{ lineHeight: 22 }}>
              {analysis.healthInsight}
            </Body>
            {/* Allergens here */}
            {analysis.allergens?.length > 0 && (
              <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {analysis.allergens.map((a, i) => <Badge key={i} label={a} type="error" />)}
              </View>
            )}
          </Card>

          {/* Notes Input */}
          {(isEditing || !logData) && (
            <View style={styles.section}>
              <Heading level={3} style={styles.sectionTitle}>Notes</Heading>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.surface, color: colors.text.primary }]}
                placeholder="Add notes..."
                placeholderTextColor={colors.text.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          )}

          <GradientButton
            title={isEditing ? "Save Changes" : (logData ? "Add Again to Diary" : "Save to Diary")}
            onPress={saveToLog}
            style={{ marginTop: SPACING.md, marginBottom: 50 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.lg, marginBottom: 4 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: RADIUS.md },

  heroBackground: { width: '100%', height: 380 },
  heroGradient: { flex: 1, padding: SPACING.lg, justifyContent: 'space-between' },
  headerNav: { marginTop: 50, flexDirection: 'row', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  scoreHeroCard: { alignItems: 'center', paddingVertical: SPACING.lg, marginTop: 'auto' },
  nameHeader: { marginTop: 10, marginBottom: 8, width: '100%' },
  nameInput: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },

  contentContainer: { padding: SPACING.lg, marginTop: -10 },

  suggestionBlock: { marginBottom: SPACING.xl },
  altChip: { marginRight: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },

  portionSection: { marginBottom: SPACING.xl },
  stepperContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: RADIUS.lg },
  stepperBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft },

  macrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.xl },
  macroItem: { width: '48%', aspectRatio: 1.4, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: SPACING.xl },

  verdictCard: { padding: SPACING.md, marginBottom: SPACING.xl },
  verdictHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },

  section: { marginBottom: SPACING.xl },
  sectionTitle: { marginBottom: SPACING.md },
  notesInput: { padding: SPACING.md, borderRadius: RADIUS.md, fontSize: 15, minHeight: 80, textAlignVertical: 'top' }
});
