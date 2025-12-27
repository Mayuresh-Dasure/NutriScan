import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import { auth } from '../services/firebaseConfig'; // Ensure this path is correct based on project structure
import { RADIUS, SPACING } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // New: Inline error state
  const [errorDetails, setErrorDetails] = useState('');

  const handleAuth = async () => {
    setErrorDetails(''); // Clear previous errors

    if (!email || !password) {
      setErrorDetails('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Success is handled by onAuthStateChanged in App.js
    } catch (error) {
      console.log(error);
      let msg = 'Authentication failed. Please check your connection.';

      if (error.code === 'auth/invalid-email') msg = 'Invalid email address format.';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect password. Try "Forgot Password"?';
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered. Try logging in.';
      if (error.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
      if (error.code === 'auth/invalid-credential') msg = 'Incorrect email or password.';
      if (error.code === 'auth/user-not-found') msg = 'No account found. Please sign up first.';
      if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Reset password or try later.';

      setErrorDetails(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorDetails('Please enter your email to reset password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Email Sent', 'Check your inbox for password reset instructions.');
      setErrorDetails('');
    } catch (e) {
      console.log(e);
      if (e.code === 'auth/user-not-found') setErrorDetails('No account found with this email.');
      else setErrorDetails('Failed to send reset email.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Immersive Background */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#020617']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Ionicons name="nutrition" size={32} color="#10b981" />
            <Text style={styles.appName}>NutriScan<Text style={{ color: '#10b981' }}>AI</Text></Text>
          </View>
          <Text style={styles.headerTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.headerSubtitle}>{isLogin ? 'Sign in to continue your healthy journey' : 'Start your personalized nutrition plan today'}</Text>
        </View>



        {/* Form Section */}
        <View style={styles.formSection}>

          {/* Error Banner */}
          {errorDetails ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#f87171" />
              <Text style={styles.errorText}>{errorDetails}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={[styles.inputWrapper, errorDetails && styles.inputError]}>
            <Ionicons name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorDetails) setErrorDetails('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={[styles.inputWrapper, errorDetails && styles.inputError, { marginTop: 12 }]}>
            <Ionicons name="lock-closed" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorDetails) setErrorDetails('');
              }}
              secureTextEntry
            />
          </View>

          {/* Forgot Password */}
          {isLogin && (
            <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8, padding: 4 }} onPress={handleForgotPassword}>
              <Text style={styles.forgotPassText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Main Action Button */}
          <TouchableOpacity
            style={[styles.submitButtonContainer, { marginTop: isLogin ? 24 : 32 }]}
            activeOpacity={0.9}
            onPress={handleAuth}
            disabled={loading}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            setIsLogin(!isLogin);
            setErrorDetails('');
          }} style={{ marginTop: 24, alignSelf: 'center' }}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
            </Text>
          </TouchableOpacity>

        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },

  // Socials
  socialSection: {
    width: '100%',
    marginBottom: 24
  },
  socialBtnMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b', // Lighter slate
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12
  },
  socialBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%'
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  dividerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 16,
    letterSpacing: 0.5
  },

  // Form
  formSection: {
    width: '100%',
  },
  inputWrapper: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Darker input bg
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.05)'
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#fff',
    fontSize: 15
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    flex: 1,
    fontWeight: '500'
  },

  forgotPassText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600'
  },

  submitButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14
  }
});

