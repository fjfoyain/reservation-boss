import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Alert, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'internal' | 'external' | 'none';
  internalSpot: string | null;
  active: boolean;
  isAdmin?: boolean;
}

const ROLE_META = {
  internal: { label: 'Internal', color: Colors.blue,     bg: '#DBEAFE' },
  external: { label: 'External', color: Colors.teal,     bg: '#CFFAFE' },
  none:     { label: 'No role',  color: Colors.textMuted, bg: Colors.border },
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v3/admin/users');
      setUsers(data.users ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load users');
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

  function showUserActions(user: User) {
    Alert.alert(
      user.name || user.email,
      `Role: ${ROLE_META[user.role]?.label ?? user.role} · ${user.active ? 'Active' : 'Inactive'}`,
      [
        {
          text: 'Change role',
          onPress: () => showRolePicker(user),
        },
        {
          text: user.active ? 'Deactivate account' : 'Activate account',
          style: user.active ? 'destructive' : 'default',
          onPress: () => toggleActive(user),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  function showRolePicker(user: User) {
    Alert.alert(
      'Change role',
      `Select role for ${user.name || user.email}`,
      [
        { text: 'Internal (fixed spot)', onPress: () => updateRole(user, 'internal') },
        { text: 'External (daily reservation)', onPress: () => updateRole(user, 'external') },
        { text: 'No role', onPress: () => updateRole(user, 'none') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  async function updateRole(user: User, role: string) {
    setActing(user.id);
    try {
      await apiFetch(`/api/v3/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, role: role as User['role'], internalSpot: role !== 'internal' ? null : u.internalSpot } : u
      ));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not update role');
    } finally {
      setActing(null);
    }
  }

  async function toggleActive(user: User) {
    const newActive = !user.active;
    Alert.alert(
      newActive ? 'Activate account' : 'Deactivate account',
      `${newActive ? 'Activate' : 'Deactivate'} ${user.name || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newActive ? 'Activate' : 'Deactivate',
          style: newActive ? 'default' : 'destructive',
          onPress: async () => {
            setActing(user.id);
            try {
              await apiFetch(`/api/v3/admin/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ active: newActive }),
              });
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: newActive } : u));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not update user');
            } finally {
              setActing(null);
            }
          },
        },
      ],
    );
  }

  const filtered = search.trim()
    ? users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
        ListHeaderComponent={
          <Text style={styles.listHeader}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="person-off" size={40} color={Colors.border} />
            <Text style={styles.emptyTxt}>No users found</Text>
          </View>
        }
        renderItem={({ item: user }) => {
          const roleMeta = ROLE_META[user.role] ?? ROLE_META.none;
          const isActing = acting === user.id;
          return (
            <TouchableOpacity
              style={[styles.userCard, !user.active && styles.userCardInactive]}
              onPress={() => showUserActions(user)}
              disabled={isActing}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarTxt}>{user.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName} numberOfLines={1}>{user.name || '(no name)'}</Text>
                  {user.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeTxt}>Admin</Text>
                    </View>
                  )}
                  {!user.active && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeTxt}>Inactive</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                <View style={styles.userMeta}>
                  <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg }]}>
                    <Text style={[styles.roleLabel, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                  </View>
                  {user.internalSpot && (
                    <View style={styles.spotBadge}>
                      <MaterialIcons name="local-parking" size={10} color={Colors.blue} />
                      <Text style={styles.spotTxt}>{user.internalSpot}</Text>
                    </View>
                  )}
                </View>
              </View>
              {isActing
                ? <ActivityIndicator size="small" color={Colors.teal} />
                : <MaterialIcons name="more-vert" size={20} color={Colors.textMuted} />
              }
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary, paddingVertical: 6 },
  list: { padding: Spacing.md, gap: Spacing.xs },
  listHeader: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500', marginBottom: Spacing.xs },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  userCardInactive: { opacity: 0.55 },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatarTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  userInfo: { flex: 1, gap: 2 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  userName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1 },
  adminBadge: { backgroundColor: '#FEE2E2', borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 1 },
  adminBadgeTxt: { fontSize: FontSize.xs - 1, color: Colors.red, fontWeight: '700' },
  inactiveBadge: { backgroundColor: Colors.border, borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 1 },
  inactiveBadgeTxt: { fontSize: FontSize.xs - 1, color: Colors.textMuted, fontWeight: '600' },
  userEmail: { fontSize: FontSize.xs, color: Colors.textSecondary },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  roleBadge: { borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 2 },
  roleLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  spotBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EFF6FF', borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 2 },
  spotTxt: { fontSize: FontSize.xs, color: Colors.blue, fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 60 },
  emptyTxt: { fontSize: FontSize.sm, color: Colors.textMuted },
});
