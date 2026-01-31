import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { get, push, ref, remove, serverTimestamp, update } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { Badge } from '../components/Badges';
import { Card } from '../components/Card';
import { GradientButton } from '../components/GradientButton';
import ProductChatModal from '../components/ProductChatModal';
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
  const [isSaving, setIsSaving] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [productName, setProductName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');

  // Animation State
  const [animatedScore, setAnimatedScore] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);

  const { imageUri, logData } = route.params || {};

  useEffect(() => {
    let target = 0;
    if (logData) {
      // History Mode
      const portions = logData.portions || 1;
      setAnalysis({ ...logData });
      setProductName(logData.productName || '');
      setNotes(logData.notes || '');
      setMultiplier(portions);
      target = logData.healthScore || 0;
    } else if (imageUri) {
      // Scan Mode
      processImage(imageUri);
      return;
    }
    checkFavorite();

    if (logData) animateScore(target);

  }, [imageUri, logData]);

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

  const shareResult = async () => {
    try {
      await Share.share({
        message: `Check out this food analysis for ${productName || 'this item'}! Health Score: ${analysis?.healthScore}/100. Analyzed by NutriScan.`,
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  const saveToLog = async () => {
    if (isSaving) return;
    if (!analysis || !productName.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const entryData = {
        productName,
        ...analysis,
        notes,
        portions: multiplier,
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
          imageUrl: analysis.imageUrl || null,
          ...entryData
        };
        await push(logsRef, newLog);
        await updateStreakAndAchievements(user.uid, newLog);
        navigation.navigate('Diary', { toast: 'Saved to diary!' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const adjustPortion = (delta) => {
    setMultiplier(prev => Math.max(0.5, Math.round((prev + delta) * 10) / 10));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#fbbf24';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  // Tips State
  const [loadingTip, setLoadingTip] = useState("Analyzing ingredients...");
  useEffect(() => {
    if (loading) {
      const tips = ["Did you know fiber keeps you full longer?", "Protein is essential for muscle repair.", "Hidden sugars often appear as 'Dextrose' or 'Syrup'.", "Checking nutritional values..."];
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
  const calcVal = (val) => (val === null || val === undefined) ? null : Math.round(val * multiplier * 10) / 10;

  const displayCal = (analysis.calories === null || analysis.calories === undefined) ? null : Math.round(analysis.calories * multiplier);
  const displayProt = calcVal(analysis.protein);
  const displayCarbs = calcVal(analysis.carbohydrates);
  const displayFat = calcVal(analysis.totalFat);
  const displaySugar = calcVal(analysis.sugar?.labelSugar);

  // Helper for watch out section
  const getRisks = () => {
    const r = [];
    if (analysis.preservatives) {
      analysis.preservatives.forEach(p => r.push({ type: 'Preservative', name: p.name, concern: p.concern, icon: 'warning' }));
    }
    if (analysis.additives) {
      analysis.additives.forEach(a => r.push({ type: 'Additive', name: a.name, concern: a.concern, icon: 'science' }));
    }
    if (analysis.sugar?.hiddenSugars?.length > 0) {
      analysis.sugar.hiddenSugars.forEach(s => r.push({ type: 'Hidden Sugar', name: s, concern: 'Hidden sweetener', icon: 'water-drop' }));
    }
    return r;
  };
  const risks = getRisks();

  const MacroItem = ({ label, value, unit, color }) => (
    <View style={[styles.macroItem, { backgroundColor: colors.surface }]}>
      <Heading level={2} style={{ color: value !== null ? (color || colors.text.primary) : colors.text.muted }}>
        {value !== null ? value : '--'}
      </Heading>
      <Label style={{ marginTop: 2 }}>{label} {unit && `(${unit})`}</Label>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>

        {/* New Header */}
        <ImageBackground
          source={{ uri: imageUri || logData?.imageUri || logData?.imageUrl || analysis?.imageUrl }}
          style={[styles.headerBackground, { backgroundColor: colors.surface }]}
          resizeMode="cover"
          blurRadius={15}
        >
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} style={styles.headerOverlay}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {logData && (
                  <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={[styles.iconBtn, isEditing && { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="edit" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={shareResult} style={styles.iconBtn}>
                  <Ionicons name="share-social-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleFavorite} style={styles.iconBtn}>
                  <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#ff4757" : "#fff"} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.centeredHeaderContent}>
              {/* Health Score Focus */}
              <View style={styles.scoreWrapper}>
                <ProgressRing
                  progress={animatedScore}
                  size={160}
                  strokeWidth={14}
                  color={scoreColor}
                  hideLegend={true}
                />
                <View style={styles.scoreTextOverlay}>
                  <Heading style={{ fontSize: 48, color: '#fff', includeFontPadding: false }}>{animatedScore}</Heading>
                  <Label style={{ color: '#fff', opacity: 0.8, fontSize: 14 }}>HEALTH</Label>
                </View>
              </View>

              <View style={styles.productTitleBlock}>
                <TextInput
                  style={[styles.nameInput, isEditing && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)' }]}
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="Product Name"
                  placeholderTextColor="#ccc"
                  editable={isEditing || !logData}
                  multiline
                />
                <View style={{ marginTop: 8 }}>
                  <Badge
                    label={analysis.vegetarianStatus}
                    type={analysis.vegetarianStatus?.includes('Non') ? 'error' : 'success'}
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.bodyContent}>

          {/* AI Assessment Card */}
          <Card style={styles.sectionCard}>
            <View style={[styles.rowHeader, { marginBottom: 8 }]}>
              <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
              <Heading level={3} style={{ marginLeft: 8 }}>AI Assessment</Heading>
            </View>
            <Body style={{ lineHeight: 22, color: colors.text.primary }}>
              {analysis.scoreExplanation || analysis.healthInsight}
            </Body>
          </Card>

          {analysis.productType === 'Medicine' ? (
            /* MEDICINE UI */
            <View>
              {/* Dosage & Usage */}
              {(analysis.dosage || analysis.usageInstructions) && (
                <View style={styles.section}>
                  <Heading level={3} style={{ marginBottom: 12 }}>Usage & Dosage</Heading>
                  <Card style={{ padding: 16 }}>
                    {analysis.dosage && (
                      <View style={{ marginBottom: 12 }}>
                        <Label muted>Recommended Dosage</Label>
                        <Body style={{ fontWeight: '600', color: colors.text.primary }}>{analysis.dosage}</Body>
                      </View>
                    )}
                    {analysis.usageInstructions && (
                      <View>
                        <Label muted>Instructions</Label>
                        <Body style={{ color: colors.text.primary }}>{analysis.usageInstructions}</Body>
                      </View>
                    )}
                  </Card>
                </View>
              )}

              {/* Active Ingredients */}
              {analysis.activeIngredients?.length > 0 && (
                <View style={styles.section}>
                  <Heading level={3} style={{ marginBottom: 12 }}>Active Ingredients</Heading>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {analysis.activeIngredients.map((ing, i) => (
                      <View key={i} style={[styles.altChip, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                        <Body style={{ fontWeight: '600', color: colors.primary }}>{ing}</Body>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Warnings / Symptoms */}
              {(analysis.warnings?.length > 0 || analysis.symptoms?.length > 0) && (
                <View style={styles.watchOutSection}>
                  <Heading level={3} style={{ marginBottom: 12 }}>Important Info</Heading>

                  {analysis.symptoms?.map((sym, i) => (
                    <View key={`sym-${i}`} style={[styles.riskRow, { backgroundColor: colors.surface }]}>
                      <View style={[styles.riskIconBox, { backgroundColor: '#dbeafe' }]}>
                        <MaterialIcons name="healing" size={20} color="#3b82f6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontWeight: '700', color: colors.text.primary }}>Treats: {sym}</Body>
                      </View>
                    </View>
                  ))}

                  {analysis.warnings?.map((warn, i) => (
                    <View key={`warn-${i}`} style={[styles.riskRow, { backgroundColor: colors.surface }]}>
                      <View style={[styles.riskIconBox, { backgroundColor: '#fee2e2' }]}>
                        <MaterialIcons name="warning" size={20} color="#ef4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontWeight: '700', color: colors.text.primary }}>Warning</Body>
                        <Label muted>{warn}</Label>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* FOOD UI */
            <View>
              {/* Compact Nutrition Grid */}
              <View style={styles.gridContainer}>
                <MacroItem label="Calories" value={displayCal} unit="kcal" color={colors.text.primary} />
                <MacroItem label="Protein" value={displayProt} unit="g" color={colors.primary} />
                <MacroItem label="Fats" value={displayFat} unit="g" color="#eab308" />
                <MacroItem label="Sugar" value={displaySugar} unit="g" color="#ef4444" />
              </View>

              {/* Watch Out Section */}
              {risks.length > 0 && (
                <View style={styles.watchOutSection}>
                  <Heading level={3} style={{ marginBottom: 12 }}>Watch Out</Heading>
                  {risks.map((risk, i) => (
                    <View key={i} style={[styles.riskRow, { backgroundColor: colors.surface }]}>
                      <View style={[styles.riskIconBox, { backgroundColor: '#fee2e2' }]}>
                        <MaterialIcons name={risk.icon} size={20} color="#ef4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontWeight: '700', color: colors.text.primary }}>{risk.name}</Body>
                        <Label muted>{risk.concern}</Label>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Smart Alternatives */}
              {analysis.alternatives?.length > 0 && (
                <View style={styles.section}>
                  <Heading level={3} style={{ marginBottom: 12 }}>Better Alternatives</Heading>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {analysis.alternatives.map((alt, i) => {
                      const parts = alt.split(':');
                      const name = parts[0].trim();
                      return (
                        <View key={i} style={[styles.altChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Body style={{ fontSize: 13, fontWeight: '700' }}>{name}</Body>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Portion Control */}
          <View style={[styles.portionControl, { backgroundColor: colors.surface }]}>
            <View style={{ flex: 1 }}>
              <Label muted>Portion Size</Label>
              <Body style={{ fontWeight: '600' }}>{analysis.servingDescription || 'Serving'}</Body>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => adjustPortion(-0.5)} style={[styles.stepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee' }]}>
                <MaterialIcons name="remove" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <Heading level={3} style={{ marginHorizontal: 16 }}>x{multiplier}</Heading>
              <TouchableOpacity onPress={() => adjustPortion(0.5)} style={[styles.stepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee' }]}>
                <MaterialIcons name="add" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          {(isEditing || !logData) && (
            <View style={styles.section}>
              <Heading level={3} style={{ marginBottom: 8 }}>My Notes</Heading>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.surface, color: colors.text.primary }]}
                placeholder="E.g. Ate after gym..."
                placeholderTextColor={colors.text.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Chat Button */}
      {analysis && (
        <TouchableOpacity
          style={[styles.chatFab, { bottom: 100 }]}
          onPress={() => setChatVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.secondary || '#8b5cf6', COLORS.primary]}
            style={styles.chatFabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="chat-bubble" size={24} color="#fff" />
            <Body style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Ask AI</Body>
          </LinearGradient>
        </TouchableOpacity>
      )}



      {/* Floating/Fixed Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <GradientButton
          title={isEditing ? "Save Changes" : "Save to Diary"}
          onPress={saveToLog}
          loading={isSaving}
        />
      </View>

      <ProductChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        productContext={analysis}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.lg, marginBottom: 4 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: RADIUS.md },

  headerBackground: { width: '100%', height: 400 },
  headerOverlay: { flex: 1, paddingTop: 60, paddingHorizontal: SPACING.lg },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },

  centeredHeaderContent: { alignItems: 'center', flex: 1, paddingBottom: 20, paddingTop: 20 },
  scoreWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  scoreTextOverlay: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },

  productTitleBlock: { alignItems: 'center', width: '100%', marginTop: 20 },
  nameInput: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', width: '90%' },

  bodyContent: { marginTop: -20, paddingHorizontal: SPACING.lg, paddingBottom: 20 },

  sectionCard: { marginBottom: SPACING.lg, padding: SPACING.lg },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: SPACING.lg },
  macroItem: { width: '48%', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md, ...SHADOWS.soft },

  watchOutSection: { marginBottom: SPACING.lg },
  riskRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: RADIUS.md, marginBottom: 8 },
  riskIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },

  section: { marginBottom: SPACING.lg },
  altChip: { marginRight: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },

  portionControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: RADIUS.lg, marginBottom: SPACING.lg },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },

  notesInput: { padding: SPACING.md, borderRadius: RADIUS.md, minHeight: 80, textAlignVertical: 'top' },

  chatFab: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 100,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.premium,
  },
  chatFabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
  },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, borderTopWidth: 1 }
});
