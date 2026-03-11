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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Colors, Spacing, Radii, FontSize } from '@/lib/constants';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your work email and we'll send you a link to reset your password.
        </Text>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✓ Email sent! Check your inbox and follow the link.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

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
                returnKeyType="send"
                onSubmitEditing={handleReset}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.buttonText}>Send reset link</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  backBtn: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backText: {
    color: Colors.teal,
    fontSize: FontSize.base,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: FontSize.sm,
  },
  successBox: {
    gap: Spacing.lg,
  },
  successText: {
    backgroundColor: 'rgba(5,150,105,0.15)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    color: '#6EE7B7',
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
});
