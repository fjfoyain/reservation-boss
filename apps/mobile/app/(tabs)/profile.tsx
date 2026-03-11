import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.email?.charAt(0).toUpperCase() ?? '?'}
        </Text>
      </View>
      <Text style={styles.email}>{user?.email}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: '700' },
  email: { fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: Spacing.xxl },
  logoutBtn: { backgroundColor: Colors.red, borderRadius: Radii.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  logoutText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.base },
});
