import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { GradientButton } from '../components/GradientButton';
import { Body, Heading } from '../components/Typography';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchProductByBarcode } from '../services/barcodeService';

const SCAN_MODES = {
  LABEL: 'label',
  BARCODE: 'barcode',
};

const GUIDANCE_TIPS = [
  "Hold the camera steady",
  "Ensure good lighting",
  "Align text within the frame",
  "Avoid glare on the label"
];

const CameraType = {
  back: 'back',
  front: 'front',
};

export default function ScanScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { width, height } = Dimensions.get('window');
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [scanMode, setScanMode] = useState(SCAN_MODES.LABEL);
  const [scanned, setScanned] = useState(false);
  const [guidance, setGuidance] = useState(GUIDANCE_TIPS[0]);

  // Viewfinder Settings
  const vSize = 300;
  const vRadius = 80;
  const vTop = (height - vSize) / 2 - 40;
  const vLeft = (width - vSize) / 2;

  const cameraRef = useRef(null);
  const shutterAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const guidanceOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Laser Scan Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2500, useNativeDriver: true })
      ])
    ).start();

    // Corner Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Rotate guidance and animate opacity
    const interval = setInterval(() => {
      Animated.timing(guidanceOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setGuidance(prev => {
          const idx = GUIDANCE_TIPS.indexOf(prev);
          return GUIDANCE_TIPS[(idx + 1) % GUIDANCE_TIPS.length];
        });
        Animated.timing(guidanceOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!permission) return <View style={styles.blackBg} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <MaterialIcons name="no-photography" size={64} color={colors.text.muted} />
        <Heading level={2} style={styles.permissionTitle}>Camera Access Required</Heading>
        <Body muted style={styles.permissionText}>We need camera access to instantly analyze food labels and provide nutrition insights.</Body>
        <GradientButton
          title="Allow Camera Access"
          onPress={requestPermission}
          style={{ width: '100%', marginTop: SPACING.xl }}
        />
      </View>
    );
  }

  const triggerShutterEffect = () => {
    Animated.sequence([
      Animated.timing(shutterAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shutterAnim, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();
  };

  const handleCapture = async () => {
    if (loading || !cameraRef.current) return;

    triggerShutterEffect();
    setLoading(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });
      navigation.navigate('Result', { imageUri: photo.uri });
    } catch (error) {
      Alert.alert('Error', 'Failed to capture: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        navigation.navigate('Result', { imageUri: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const toggleCameraType = () => {
    setCameraType(prev => prev === CameraType.back ? CameraType.front : CameraType.back);
  };

  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanMode !== SCAN_MODES.BARCODE || scanned || loading) return;

    setScanned(true);
    setLoading(true);
    try {
      console.log(`Scanned barcode: ${data} (type: ${type})`);
      const productData = await fetchProductByBarcode(data);

      if (productData) {
        navigation.navigate('Result', { logData: productData });
      } else {
        // Fallback: Product not found in database, use AI estimation
        console.log("Barcode not found, falling back to AI assessment");
        // We need to capture an image for AI assessment
        handleCapture();
      }
    } catch (error) {
      console.error("Barcode handling error:", error);
      Alert.alert(
        'Scan Error',
        'Something went wrong while identifying this product. Please try scanning the label.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleScanMode = () => {
    setScanMode(prev => prev === SCAN_MODES.LABEL ? SCAN_MODES.BARCODE : SCAN_MODES.LABEL);
    setScanned(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        enableTorch={torch}
        facing={cameraType}
        barcodeScannerSettings={scanMode === SCAN_MODES.BARCODE ? {
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar', 'aztec', 'datamatrix', 'pdf417'],
        } : undefined}
        onBarcodeScanned={scanMode === SCAN_MODES.BARCODE ? handleBarcodeScanned : undefined}
      />

      {/* Shutter Animation Overlay */}
      <Animated.View style={[styles.shutterOverlay, { opacity: shutterAnim }]} />

      {/* Premium SVG Overlay with Rounded Aperture */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height="100%" width="100%">
          <Defs>
            <Mask id="mask" x="0" y="0" height="100%" width="100%">
              <Rect height="100%" width="100%" fill="white" />
              <Rect
                x={vLeft}
                y={vTop}
                width={vSize}
                height={vSize}
                rx={vRadius}
                fill="black"
              />
            </Mask>
          </Defs>
          <Rect
            height="100%"
            width="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#mask)"
          />
        </Svg>
      </View>

      {/* Viewfinder Content & Indicators */}
      <View style={[styles.viewfinderContainer, { top: vTop, left: vLeft, width: vSize, height: vSize }]} pointerEvents="none">
        <View style={[styles.viewfinderBase, { borderRadius: vRadius }]}>
          {/* Vertical Laser Scan Bar */}
          <Animated.View
            style={[
              styles.scanBar,
              {
                transform: [{
                  translateY: scanAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, vSize + 10]
                  })
                }]
              }
            ]}
          >
            <ExpoLinearGradient
              colors={[colors.primary + '00', colors.primary, colors.primary + '00']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Pulsing Curved Corners */}
        <Animated.View style={[styles.cornerTL, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
        <Animated.View style={[styles.cornerTR, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
        <Animated.View style={[styles.cornerBL, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
        <Animated.View style={[styles.cornerBR, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
      </View>

      <View style={[styles.guidanceContainer, { top: vTop + vSize + 30 }]}>
        <Animated.View style={[styles.guidancePill, { opacity: guidanceOpacity }]}>
          <MaterialIcons name="info-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Body inverse style={styles.instructionText}>{guidance}</Body>
        </Animated.View>
      </View>

      {/* Header with Blur */}
      <BlurView intensity={20} style={styles.topControls}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setTorch(!torch)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={torch ? "flash" : "flash-off-outline"}
            size={24}
            color={torch ? "#f1c40f" : "#fff"}
          />
        </TouchableOpacity>
      </BlurView>

      {/* Footer with Blur */}
      <BlurView intensity={30} style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={pickImage}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Shutter Button - Works in both modes */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.shutterButtonOuter}
          onPress={handleCapture}
          disabled={loading}
        >
          <View style={styles.shutterButtonInner}>
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : scanMode === SCAN_MODES.BARCODE ? (
              <MaterialIcons name="qr-code-scanner" size={28} color={COLORS.primary} />
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Scan Mode Toggle */}
        <TouchableOpacity
          style={[styles.secondaryButton, scanMode === SCAN_MODES.BARCODE && { backgroundColor: COLORS.primary }]}
          onPress={toggleScanMode}
          disabled={loading}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={scanMode === SCAN_MODES.BARCODE ? "camera-alt" : "qr-code-scanner"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  blackBg: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000' },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  permissionTitle: { marginTop: SPACING.lg },
  permissionText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  camera: { ...StyleSheet.absoluteFillObject },
  shutterOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 20, pointerEvents: 'none' },

  viewfinderContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  viewfinderBase: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.01)', // Needed for clipping on some Android versions
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  guidanceContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },

  guidancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  instructionText: {
    fontWeight: '600',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.3,
  },

  scanBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },

  cornerTL: { position: 'absolute', top: -8, left: -8, width: 50, height: 50, borderTopWidth: 5, borderLeftWidth: 5, borderColor: COLORS.primary, borderTopLeftRadius: 44 },
  cornerTR: { position: 'absolute', top: -8, right: -8, width: 50, height: 50, borderTopWidth: 5, borderRightWidth: 5, borderColor: COLORS.primary, borderTopRightRadius: 44 },
  cornerBL: { position: 'absolute', bottom: -8, left: -8, width: 50, height: 50, borderBottomWidth: 5, borderLeftWidth: 5, borderColor: COLORS.primary, borderBottomLeftRadius: 44 },
  cornerBR: { position: 'absolute', bottom: -8, right: -8, width: 50, height: 50, borderBottomWidth: 5, borderRightWidth: 5, borderColor: COLORS.primary, borderBottomRightRadius: 44 },

  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    paddingTop: 60,
    paddingHorizontal: 24,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: SPACING.screen,
    zIndex: 10,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  shutterButtonOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...SHADOWS.premium,
  },
  shutterButtonInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
});
