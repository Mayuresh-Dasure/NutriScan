import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { get, push, ref, serverTimestamp } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, database } from '../services/firebaseConfig';
import { analyzeImageWithGemini } from '../services/geminiService';

export default function ResultScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [productName, setProductName] = useState('');

  const imageUri = route?.params?.imageUri || '';

  useEffect(() => {
    if (imageUri) {
      processImage(imageUri);
    }
  }, [imageUri]);

  const processImage = async (uri) => {
    setLoading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

      // Get User Settings
      const user = auth.currentUser;
      let userProfile = { vegType: 'Vegetarian', goal: 'General Health' };

      if (user) {
        const snapshot = await get(ref(database, `users/${user.uid}/settings`));
        if (snapshot.exists()) {
          const s = snapshot.val();
          const diet = s.diet ? (Array.isArray(s.diet) ? s.diet.join(', ') : s.diet) : 'Vegetarian';
          userProfile = {
            vegType: diet,
            goal: s.goal || 'General Health'
          };
        }
      }

      const data = await analyzeImageWithGemini(base64, userProfile);

      if (data) {
        setAnalysis(data);
        if (data.productName) setProductName(data.productName);
      }
    } catch (error) {
      console.error("Process Image Error:", error);
      Alert.alert('Error', 'Could not analyze image. Please try again. \n' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToLog = async () => {
    if (!analysis || !productName.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const logsRef = ref(database, `users/${user.uid}/foodLogs`);
      await push(logsRef, {
        timestamp: serverTimestamp(),
        productName,
        ...analysis,
        imageUri,
      });

      Alert.alert('Success', 'Saved to your food log!');
      navigation.navigate('Today');
    } catch (error) {
      Alert.alert('Error', 'Failed to save to Firebase.');
    }
  };

  const shareResult = async () => {
    if (!analysis) return;
    try {
      const message = `I just analyzed ${productName} with LabelScanner!\n\nHealth Score: ${analysis.healthScore}/100\nKey Insight: ${analysis.healthInsight}`;
      await Share.share({ message });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  // Helper for colors
  const getScoreColor = (score) => {
    if (score >= 75) return '#27ae60';
    if (score >= 40) return '#f39c12';
    return '#e74c3c';
  };

  if (!analysis && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="broken-image" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No analysis available</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#208091" />
        <Text style={styles.loadingText}>Analyzing Label...</Text>
        <Text style={styles.loadingSubText}>This may take a few seconds</Text>
      </View>
    );
  }

  const scoreColor = getScoreColor(analysis.healthScore);

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero Section */}
        <ImageBackground source={{ uri: imageUri }} style={styles.heroBackground} blurRadius={10}>
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} style={styles.heroGradient}>

            {/* Header Nav */}
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={shareResult} style={styles.iconBtn}>
                <Ionicons name="share-social-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Score Display */}
            <View style={styles.heroContent}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>{analysis.healthScore}</Text>
                <Text style={styles.scoreLabel}>Health Score</Text>
              </View>

              {/* Editable Name */}
              <View style={styles.nameContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={productName}
                  onChangeText={setProductName}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <MaterialIcons name="edit" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: 8 }} />
              </View>

              <View style={[styles.statusBadge, { backgroundColor: analysis.vegetarianStatus.toLowerCase().includes('non') ? '#e74c3c' : '#27ae60' }]}>
                <Text style={styles.statusText}>{analysis.vegetarianStatus}</Text>
              </View>
            </View>

          </LinearGradient>
        </ImageBackground>

        <View style={styles.contentContainer}>

          {/* AI Insight Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="auto-awesome" size={24} color="#208091" />
              <Text style={styles.cardTitle}>AI Assessment</Text>
            </View>
            <Text style={styles.insightText}>{analysis.healthInsight}</Text>
          </View>

          {/* Nutrition Grid */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="nutrition" size={22} color="#208091" />
              <Text style={styles.cardTitle}>Nutrition Facts</Text>
            </View>
            <View style={styles.nutritionRow}>
              <View style={styles.nutrientBox}>
                <Text style={styles.nutrientVal}>{analysis.calories}</Text>
                <Text style={styles.nutrientLbl}>Calories</Text>
              </View>
              <View style={styles.nutrientBox}>
                <Text style={styles.nutrientVal}>{analysis.protein}g</Text>
                <Text style={styles.nutrientLbl}>Protein</Text>
              </View>
              <View style={styles.nutrientBox}>
                <Text style={styles.nutrientVal}>{analysis.totalFat}g</Text>
                <Text style={styles.nutrientLbl}>Fats</Text>
              </View>
              <View style={styles.nutrientBox}>
                <Text style={styles.nutrientVal}>{analysis.sugar?.labelSugar || '-'}g</Text>
                <Text style={styles.nutrientLbl}>Sugar</Text>
              </View>
            </View>
          </View>

          {/* Warnings Section (Dynamic) */}
          {(analysis.preservatives?.length > 0 || analysis.additives?.length > 0 || analysis.sugar?.estimatedTotalSugar > 10) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="warning" size={22} color="#e67e22" />
                <Text style={styles.cardTitle}>Watch Out</Text>
              </View>

              {/* High Sugar Warning */}
              {analysis.sugar?.estimatedTotalSugar > 10 && (
                <View style={styles.warningRow}>
                  <MaterialIcons name="subdirectory-arrow-right" size={18} color="#e74c3c" />
                  <Text style={styles.warningText}>High Sugar Content (~{analysis.sugar.estimatedTotalSugar}g)</Text>
                </View>
              )}

              {/* Additives */}
              {analysis.additives?.map((item, i) => (
                <View key={i} style={styles.warningRow}>
                  <MaterialIcons name="science" size={18} color="#8e44ad" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warningText}>{item.name}</Text>
                    <Text style={styles.warningSub}>{item.concern}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={saveToLog}>
            <LinearGradient colors={['#208091', '#16a085']} style={styles.saveGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.saveBtnText}>Save to Diary</Text>
              <MaterialIcons name="check" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  emptyText: { fontSize: 16, color: '#666', marginTop: 16 },
  retryBtn: { marginTop: 16, padding: 12, backgroundColor: '#208091', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  loadingText: { marginTop: 20, fontSize: 18, fontWeight: '600', color: '#208091' },
  loadingSubText: { marginTop: 8, fontSize: 14, color: '#999' },

  // Hero
  heroBackground: { width: '100%', height: 380 },
  heroGradient: { flex: 1, justifyContent: 'space-between', padding: 20, paddingBottom: 40 },
  headerNav: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },

  heroContent: { alignItems: 'center' },
  scoreCircle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 6, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10
  },
  scoreValue: { fontSize: 42, fontWeight: '800' },
  scoreLabel: { fontSize: 10, color: '#777', textTransform: 'uppercase', marginTop: 0 },

  nameContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 8, marginBottom: 12 },
  nameInput: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', minWidth: 100 },

  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: '#fff', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },

  // Content
  contentContainer: { padding: 20, marginTop: -30 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  insightText: { fontSize: 14, color: '#444', lineHeight: 22 },

  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nutrientBox: { alignItems: 'center', flex: 1 },
  nutrientVal: { fontSize: 18, fontWeight: '700', color: '#208091' },
  nutrientLbl: { fontSize: 12, color: '#888', marginTop: 4 },

  warningRow: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'flex-start' },
  warningText: { fontSize: 14, color: '#c0392b', fontWeight: '600' },
  warningSub: { fontSize: 12, color: '#7f8c8d' },

  saveBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  saveGradient: { padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
