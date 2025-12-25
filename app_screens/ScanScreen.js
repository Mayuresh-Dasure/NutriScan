import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false); // Flash state
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  if (!permission) return <View style={styles.blackBg} />;
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialIcons name="no-photography" size={64} color="#666" />
        <Text style={styles.permissionText}>Camera access is needed to scan labels.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (loading || !cameraRef.current) return;
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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        enableTorch={torch}
        facing={facing}
      />

      {/* Darkened Overlay with transparent cutout */}
      <View style={styles.overlayContainer}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.focusFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.instructionText}>Align food label within frame</Text>
        </View>
      </View>

      {/* Top Controls (Close & Flash) */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => setTorch(!torch)}>
          <Ionicons name={torch ? "flash" : "flash-off"} size={24} color={torch ? "#f1c40f" : "#fff"} />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Gallery Button */}
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage} disabled={loading}>
          <Ionicons name="images" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Shutter Button */}
        <TouchableOpacity style={styles.shutterButtonOuter} onPress={handleCapture} disabled={loading}>
          <View style={styles.shutterButtonInner}>
            {loading && <ActivityIndicator size="small" color="#208091" />}
          </View>
        </TouchableOpacity>

        {/* Flip Camera Toggle */}
        <TouchableOpacity style={styles.secondaryButton} onPress={toggleCameraFacing} disabled={loading}>
          <MaterialIcons name="flip-camera-ios" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blackBg: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000' },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionText: { color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center', opacity: 0.8 },
  permissionButton: { marginTop: 20, backgroundColor: '#208091', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  permissionButtonText: { color: '#fff', fontWeight: 'bold' },

  camera: { ...StyleSheet.absoluteFillObject },

  // Overlay System
  overlayContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: 280 }, // Frame height
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  focusFrame: { width: 280, height: 280, backgroundColor: 'transparent' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 20 },

  instructionText: { color: '#fff', fontSize: 14, fontWeight: '500', opacity: 0.9, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },

  // Frame Corners
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#208091', borderTopLeftRadius: 16 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#208091', borderTopRightRadius: 16 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#208091', borderBottomLeftRadius: 16 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#208091', borderBottomRightRadius: 16 },

  // UI Controls
  topControls: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bottomControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingBottom: 50, paddingTop: 30, zIndex: 10
  },

  iconButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  secondaryButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },

  shutterButtonOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center'
  },
  shutterButtonInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },

});
