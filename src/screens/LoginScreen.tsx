import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  StatusBar as RNStatusBar,
  Keyboard,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import {
  useFonts,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_HEIGHT * 0.36;

export const LoginScreen: React.FC = () => {
  const { login, isLoggingIn, serverUrl, updateServerUrl } = useAuth();

  const [fontsLoaded] = useFonts({
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });

  const [identifier, setIdentifier] = useState('0901234567');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Hiệu ứng rung nhẹ khi nhập sai
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Modal cấu hình Server URL
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState(serverUrl);

  const clearError = () => {
    if (hasError) setHasError(false);
    if (errorMessage) setErrorMessage(null);
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    clearError();

    if (!identifier.trim()) {
      setHasError(true);
      setErrorMessage('Vui lòng nhập email hoặc số điện thoại.');
      triggerShake();
      return;
    }
    if (!password) {
      setHasError(true);
      setErrorMessage('Vui lòng nhập mật khẩu.');
      triggerShake();
      return;
    }

    const res = await login(identifier, password);
    if (!res.success) {
      setHasError(true);
      setErrorMessage(res.message || 'Số điện thoại/Email hoặc mật khẩu không chính xác.');
      triggerShake();
    }
  };

  const handleQuickFill = (accType: 'admin' | 'customer') => {
    setErrorMessage(null);
    if (accType === 'admin') {
      setIdentifier('0901234567');
      setPassword('admin123');
    } else {
      setIdentifier('0987654321');
      setPassword('user123');
    }
  };

  const handleSaveConfig = async () => {
    if (!tempServerUrl.trim()) {
      Alert.alert('Lỗi', 'Địa chỉ máy chủ không được để trống.');
      return;
    }
    await updateServerUrl(tempServerUrl.trim());
    setIsConfigOpen(false);
    Alert.alert('Thành công', 'Đã lưu cấu hình máy chủ!');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* TOP DARK HEADER WITH GEOMETRIC MOSAIC PATTERN */}
      <View style={styles.headerContainer}>
        {/* SVG Bauhaus / Geometric Mosaic Pattern */}
        <Svg
          width={SCREEN_WIDTH}
          height={HEADER_HEIGHT + 40}
          viewBox={`0 0 ${SCREEN_WIDTH} ${HEADER_HEIGHT + 40}`}
          style={StyleSheet.absoluteFill}
        >
          {/* Base Dark Background */}
          <Rect width={SCREEN_WIDTH} height={HEADER_HEIGHT + 40} fill="#0d0d0d" />

          {/* Geometric Shapes Grid Layer */}
          <G fill="#181818">
            {/* Top row */}
            <Path d="M 0 0 A 70 70 0 0 1 70 70 L 0 70 Z" fill="#161616" />
            <Rect x={70} y={0} width={60} height={60} fill="#141414" />
            <Path d="M 190 0 A 60 60 0 0 1 130 60 L 190 60 Z" fill="#1b1b1b" />
            <Circle cx={250} cy={35} r={32} fill="#151515" />
            <Path d="M 310 0 L 370 60 L 310 60 Z" fill="#191919" />
            <Path d={`M ${SCREEN_WIDTH - 60} 0 A 60 60 0 0 1 ${SCREEN_WIDTH} 60 L ${SCREEN_WIDTH} 0 Z`} fill="#171717" />

            {/* Mid row */}
            <Rect x={0} y={70} width={65} height={65} fill="#141414" />
            <Path d="M 65 70 A 65 65 0 0 1 0 135 Z" fill="#1a1a1a" />
            <Circle cx={100} cy={110} r={28} fill="#171717" />
            <Path d="M 280 70 A 70 70 0 0 1 350 140 L 280 140 Z" fill="#161616" />
            <Circle cx={SCREEN_WIDTH - 40} cy={115} r={35} fill="#1a1a1a" />

            {/* Lower row */}
            <Circle cx={40} cy={190} r={40} fill="#171717" />
            <Path d="M 80 160 A 50 50 0 0 1 130 210 L 80 210 Z" fill="#151515" />
            <Rect x={260} y={150} width={70} height={70} rx={35} fill="#181818" />
            <Path d={`M ${SCREEN_WIDTH - 80} 150 A 80 80 0 0 1 ${SCREEN_WIDTH} 230 L ${SCREEN_WIDTH - 80} 230 Z`} fill="#151515" />
          </G>
        </Svg>

        {/* Center Brand Wordmark: DE'GENT */}
        <View style={styles.logoCardWrapper}>
          <Text
            style={[
              styles.brandLogoText,
              fontsLoaded && { fontFamily: 'Archivo_600SemiBold' },
            ]}
          >
            DE'GENT
          </Text>
        </View>

        {/* Top Right Discreet Server Config Button */}
        <TouchableOpacity
          style={styles.gearButton}
          onPress={() => {
            setTempServerUrl(serverUrl);
            setIsConfigOpen(true);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* WHITE CURVED BOTTOM SHEET */}
      <View style={styles.contentSheet}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <Text style={styles.title}>Quản trị</Text>

          {/* Animated Inputs Container with Shake & Red error border */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            {/* Email Card Input */}
            <View style={[styles.inputCard, hasError && styles.inputCardError]}>
              <Mail
                size={18}
                color={hasError ? '#ef4444' : '#8E8E93'}
                strokeWidth={1.8}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputValue}
                placeholder="Email Address"
                placeholderTextColor={hasError ? '#f87171' : '#8E8E93'}
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  clearError();
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoggingIn}
              />
            </View>

            {/* Password Card Input */}
            <View style={[styles.inputCard, hasError && styles.inputCardError]}>
              <Lock
                size={18}
                color={hasError ? '#ef4444' : '#8E8E93'}
                strokeWidth={1.8}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputValue}
                placeholder="Password"
                placeholderTextColor={hasError ? '#f87171' : '#8E8E93'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoggingIn}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {showPassword ? (
                  <EyeOff size={19} color={hasError ? '#ef4444' : '#8E8E93'} strokeWidth={1.8} />
                ) : (
                  <Eye size={19} color={hasError ? '#ef4444' : '#8E8E93'} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>

            {/* In-app Error Banner directly below inputs */}
            {hasError && errorMessage ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#dc2626" strokeWidth={2} style={styles.errorBoxIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Solid Black Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoggingIn && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoggingIn}
            activeOpacity={0.88}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {/* Quick Account Fill (Admin / Customer testing) */}
          <View style={styles.quickFillSection}>
            <Text style={styles.quickFillTitle}>Tài khoản thử nghiệm nhanh:</Text>
            <View style={styles.quickFillChips}>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleQuickFill('admin')}
              >
                <Text style={styles.chipText}>👑 Admin (0901234567)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleQuickFill('customer')}
              >
                <Text style={styles.chipText}>👤 User (0987654321)</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>

      {/* Modal Cấu hình Server IP */}
      <Modal
        visible={isConfigOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsConfigOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cấu hình địa chỉ máy chủ API</Text>
            <Text style={styles.modalDescription}>
              Nhập IP hoặc URL của backend DE'GENT (khi cắm cáp USB dùng http://localhost:3000, hoặc IP WiFi nội bộ http://192.168.1.X:3000).
            </Text>

            <TextInput
              style={styles.modalInput}
              value={tempServerUrl}
              onChangeText={setTempServerUrl}
              placeholder="http://localhost:3000"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsConfigOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveConfig}
              >
                <Text style={styles.modalBtnSaveText}>Lưu cấu hình</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    backgroundColor: '#0d0d0d',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 40,
  },
  gearButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 52,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gearIcon: {
    fontSize: 16,
  },
  logoCardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  brandLogoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 8,
    paddingLeft: 8,
    textTransform: 'uppercase',
  },
  contentSheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 68,
    borderTopRightRadius: 0,
    marginTop: -26,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 36,
    paddingBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 2,
    marginBottom: 16,
  },
  errorBoxIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    flex: 1,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#f0f1f3',
  },
  inputCardError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputValue: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    paddingVertical: 0,
    fontWeight: '400',
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  loginBtn: {
    height: 56,
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quickFillSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  quickFillTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  quickFillChips: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  modalBtnSave: {
    backgroundColor: '#111827',
  },
  modalBtnSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
