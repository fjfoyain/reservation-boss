import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { formatDateLabel } from '@/lib/weekHelpers';

interface LateRequest {
  id: string;
  type: 'attendance' | 'parking' | 'room';
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: { _seconds: number } | string;
  resolvedAt: { _seconds: number } | null;
}

const STATUS_META = {
  pending:  { color: Colors.amber, bg: Colors.amber + '20', icon: 'hourglass-empty' as const, label: 'Pending' },
  approved: { color: Colors.green, bg: Colors.green + '20', icon: 'check-circle'    as const, label: 'Approved' },
  denied:   { color: Colors.red,   bg: Colors.red   + '20', icon: 'cancel'          as const, label: 'Denied' },
};

const TYPE_LABEL = { attendance: 'Attendance', parking: 'Parking', room: 'Room' };

function relativeDate(val: { _seconds: number } | string | null): string {
  if (!val) return '';
  const ts = typeof val === 'string' ? new Date(val) : new Date((val as any)._seconds * 1000);
  const d = Math.floor((Date.now() - ts.getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function RequestsScreen() {
  const [requests, setRequests] = useState<LateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v3/late-requests');
      setRequests(data.requests ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load requests');
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
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <FlatList
        data={requests}
        keyExtractor={r => r.id}
        contentContainerStyle={[styles.list, !requests.length && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="check-circle-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No requests</Text>
            <Text style={styles.emptyTxt}>Late change requests you submit will appear here</Text>
          </View>
        }
        renderItem={({ item: req }) => {
          const meta = STATUS_META[req.status];
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.cardDate}>{formatDateLabel(req.date)}</Text>
                  <Text style={styles.cardType}>{TYPE_LABEL[req.type]}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <MaterialIcons name={meta.icon} size={13} color={meta.color} />
                  <Text style={[styles.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.reasonTxt} numberOfLines={3}>{req.reason}</Text>
              <Text style={styles.submittedTxt}>
                Submitted {relativeDate(req.createdAt)}
                {req.resolvedAt ? ` · Resolved ${relativeDate(req.resolvedAt)}` : ''}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  list: { padding: Spacing.md, gap: Spacing.md },
  listEmpty: { flex: 1 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardDate: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary },
  cardType: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.full, paddingHorizontal: 9, paddingVertical: 3 },
  statusTxt: { fontSize: FontSize.xs, fontWeight: '700' },
  reasonTxt: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  submittedTxt: { fontSize: FontSize.xs, color: Colors.textMuted },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyTxt: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
