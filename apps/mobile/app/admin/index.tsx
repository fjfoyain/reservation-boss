import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';

interface Stats {
  totalUsers: number;
  pendingRequests: number;
  roomBookingsToday: number;
  officeToday: number;
}

interface StatCard {
  label: string;
  key: keyof Stats;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
}

const CARDS: StatCard[] = [
  { label: 'Total users',       key: 'totalUsers',       icon: 'people',        color: Colors.navy,  bg: Colors.navy  + '15' },
  { label: 'Pending requests',  key: 'pendingRequests',  icon: 'assignment',    color: Colors.amber, bg: Colors.amber + '20' },
  { label: 'Room bookings today', key: 'roomBookingsToday', icon: 'meeting-room', color: Colors.teal, bg: Colors.teal  + '20' },
  { label: 'In office today',   key: 'officeToday',      icon: 'business',      color: Colors.green, bg: Colors.green + '20' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v3/admin/stats');
      setStats(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load stats');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        <Text style={styles.sectionLabel}>Today's overview</Text>
        <View style={styles.grid}>
          {CARDS.map(card => (
            <View key={card.key} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: card.bg }]}>
                <MaterialIcons name={card.icon} size={22} color={card.color} />
              </View>
              <Text style={styles.cardValue}>{stats?.[card.key] ?? '—'}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Actions</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/admin/requests' as any)}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.amber + '20' }]}>
            <MaterialIcons name="assignment" size={20} color={Colors.amber} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Review requests</Text>
            <Text style={styles.actionSub}>
              {stats?.pendingRequests
                ? `${stats.pendingRequests} pending`
                : 'No pending requests'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: Spacing.xs,
  },
  cardIcon: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardValue: { fontSize: FontSize.xxxl, fontWeight: '700', color: Colors.textPrimary },
  cardLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  actionIcon: { width: 40, height: 40, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary },
  actionSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
