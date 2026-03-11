import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Colors, Spacing, Radii, FontSize } from '@/lib/constants';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      const msg = e?.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark} />
          <Text style={styles.appName}>North Highland</Text>
          <Text style={styles.appSub}>Workspace</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Use your workspace account</Text>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@northhighland.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.buttonText}>Sign in</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Don't have an account? Contact your admin.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Colors.teal,
    marginBottom: Spacing.md,
  },
  appName: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  appSub: {
    color: Colors.teal,
    fontSize: FontSize.base,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.red,
    fontSize: FontSize.sm,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.xs,
  },
  forgotText: {
    color: Colors.blue,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  button: {
    backgroundColor: Colors.blue,
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  footer: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
