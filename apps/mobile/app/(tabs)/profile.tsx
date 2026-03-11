import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface UserProfile {
  id: string; email: string; name: string;
  role: 'admin' | 'internal' | 'external' | 'none';
  internalSpot: string | null; active: boolean;
}

const ROLE_META = {
  admin:    { label: 'Admin',    color: Colors.red,   bg: '#FEE2E2' },
  internal: { label: 'Internal', color: Colors.blue,  bg: '#DBEAFE' },
  external: { label: 'External', color: Colors.teal,  bg: '#CFFAFE' },
  none:     { label: 'No role',  color: Colors.textMuted, bg: Colors.border },
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v3/profile');
      setProfile(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load profile');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try { await logout(); } catch { setSigningOut(false); }
        },
      },
    ]);
  }

  const initial = profile?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';
  const roleMeta = ROLE_META[profile?.role ?? 'none'];

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        {/* Avatar + info */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{profile?.name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg }]}>
            <Text style={[styles.roleText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
          </View>
          {profile?.internalSpot && (
            <View style={styles.spotRow}>
              <MaterialIcons name="local-parking" size={14} color={Colors.blue} />
              <Text style={styles.spotTxt}>Permanent spot: {profile.internalSpot}</Text>
            </View>
          )}
        </View>

        {/* Admin section */}
        {profile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Administration</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/admin' as any)}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: Colors.navy + '15' }]}>
                  <MaterialIcons name="dashboard" size={18} color={Colors.navy} />
                </View>
                <Text style={styles.menuTxt}>Admin dashboard</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/admin/requests' as any)}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: Colors.amber + '20' }]}>
                  <MaterialIcons name="assignment" size={18} color={Colors.amber} />
                </View>
                <Text style={styles.menuTxt}>Review requests</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, signingOut && { opacity: 0.6 }]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut
            ? <ActivityIndicator size="small" color={Colors.red} />
            : <>
                <MaterialIcons name="logout" size={18} color={Colors.red} />
                <Text style={styles.signOutTxt}>Sign out</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: '700' },
  name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary },
  roleBadge: { borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: FontSize.sm, fontWeight: '700' },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  spotTxt: { fontSize: FontSize.sm, color: Colors.blue, fontWeight: '500' },
  section: {
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg, overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuIcon: { width: 34, height: 34, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  menuTxt: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.red, borderRadius: Radii.md,
    paddingVertical: Spacing.md, marginTop: Spacing.sm,
  },
  signOutTxt: { color: Colors.red, fontSize: FontSize.base, fontWeight: '600' },
});
