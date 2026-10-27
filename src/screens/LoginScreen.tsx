import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';

export const LoginScreen: React.FC = () => {
  const { login, isLoading, serverUrl, updateServerUrl } = useAuth();

  const [identifier, setIdentifier] = useState('0901234567'); // Default admin account
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal cấu hình Server URL
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState(serverUrl);

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc email.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    const res = await login(identifier, password);
    if (!res.success) {
      setErrorMessage(res.message || 'Đăng nhập không thành công.');
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
    Alert.alert('Thành công', 'Đã lưu cấu hình địa chỉ máy chủ!');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>C</Text>
          </View>
          <Text style={styles.brandTitle}>CAISHOP</Text>
          <Text style={styles.brandBadge}>EXECUTIVE MOBILE</Text>
          <Text style={styles.brandSubtitle}>
            Hệ thống quản lý đơn hàng & danh mục sản phẩm
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập quản trị</Text>
          <Text style={styles.cardSubtitle}>
            Nhập tài khoản chủ shop hoặc quản trị viên để tiếp tục.
          </Text>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* Identifier Input */}
          <View style={styles.inputGroup}>
            <Text style={typography.label}>Số điện thoại / Email</Text>
            <TextInput
              style={styles.input}
              placeholder="0901234567 hoặc admin@caishop.vn"
              placeholderTextColor={colors.textLight}
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordHeader}>
              <Text style={typography.label}>Mật khẩu</Text>
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.toggleText}>
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Đăng nhập vào hệ thống</Text>
            )}
          </TouchableOpacity>

          {/* Quick Account Switcher Chips for convenient testing */}
          <View style={styles.quickFillSection}>
            <Text style={styles.quickFillLabel}>Tài khoản mẫu có sẵn:</Text>
            <View style={styles.quickFillRow}>
              <TouchableOpacity
                style={styles.chipButton}
                onPress={() => handleQuickFill('admin')}
              >
                <Text style={styles.chipButtonText}>👑 Admin (0901234567)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chipButton}
                onPress={() => handleQuickFill('customer')}
              >
                <Text style={styles.chipButtonText}>👤 User (0987654321)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Server Config & Footer */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.configButton}
            onPress={() => {
              setTempServerUrl(serverUrl);
              setIsConfigOpen(true);
            }}
          >
            <Text style={styles.configButtonText}>
              ⚙️ Máy chủ: <Text style={styles.configUrlText}>{serverUrl || 'Chưa thiết lập'}</Text>
            </Text>
          </TouchableOpacity>
          <Text style={styles.copyrightText}>
            CAISHOP Studio © 2026 • Quản trị tập trung
          </Text>
        </View>
      </ScrollView>

      {/* Modal chỉnh sửa Server IP / URL */}
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
              Nhập IP hoặc URL của backend CAISHOP đang chạy (Ví dụ: khi test trên điện thoại thật thì dùng IP máy tính trong mạng WiFi).
            </Text>

            <TextInput
              style={styles.modalInput}
              value={tempServerUrl}
              onChangeText={setTempServerUrl}
              placeholder="http://192.168.1.2:3000"
              placeholderTextColor={colors.textLight}
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoBadgeText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  brandBadge: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  passwordWrapper: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  passwordInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  quickFillSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickFillLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  quickFillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chipButton: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  footerContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  configButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    marginBottom: 8,
  },
  configButtonText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  configUrlText: {
    color: colors.accent,
    fontWeight: '600',
  },
  copyrightText: {
    fontSize: 11,
    color: colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 22,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  modalBtnCancel: {
    backgroundColor: colors.surfaceSubtle,
  },
  modalBtnCancelText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  modalBtnSave: {
    backgroundColor: colors.primary,
  },
  modalBtnSaveText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
