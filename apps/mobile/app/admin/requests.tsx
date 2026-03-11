import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { formatDateLabel } from '@/lib/weekHelpers';

interface AdminRequest {
  id: string;
  userName: string;
  email: string;
  type: 'attendance' | 'parking' | 'room';
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: { _seconds: number } | string;
}

const TYPE_LABEL = { attendance: 'Attendance', parking: 'Parking', room: 'Room' };
const TYPE_COLOR = { attendance: Colors.navy, parking: Colors.blue, room: Colors.teal };

function relativeDate(val: { _seconds: number } | string): string {
  const ts = typeof val === 'string' ? new Date(val) : new Date((val as any)._seconds * 1000);
  const d = Math.floor((Date.now() - ts.getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function AdminRequestsScreen() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v3/admin/late-requests?status=pending');
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

  async function handleAction(id: string, action: 'approve' | 'deny') {
    const label = action === 'approve' ? 'Approve' : 'Deny';
    const req = requests.find(r => r.id === id);
    if (!req) return;

    Alert.alert(
      `${label} request`,
      `${label} ${req.userName}'s ${TYPE_LABEL[req.type].toLowerCase()} request for ${formatDateLabel(req.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'deny' ? 'destructive' : 'default',
          onPress: async () => {
            setActing(id);
            try {
              await apiFetch(`/api/v3/admin/late-requests/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ action }),
              });
              setRequests(prev => prev.filter(r => r.id !== id));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? `Could not ${action} request`);
            } finally {
              setActing(null);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={requests}
        keyExtractor={r => r.id}
        contentContainerStyle={[styles.list, !requests.length && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
        ListHeaderComponent={
          requests.length > 0 ? (
            <Text style={styles.listHeader}>{requests.length} pending request{requests.length !== 1 ? 's' : ''}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="check-circle-outline" size={48} color={Colors.green} />
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyTxt}>No pending requests to review</Text>
          </View>
        }
        renderItem={({ item: req }) => {
          const typeColor = TYPE_COLOR[req.type];
          const isActing = acting === req.id;
          return (
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.userRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>{req.userName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>{req.userName}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{req.email}</Text>
                  </View>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: typeColor + '18' }]}>
                  <Text style={[styles.typeLabel, { color: typeColor }]}>{TYPE_LABEL[req.type]}</Text>
                </View>
              </View>

              {/* Date */}
              <View style={styles.dateRow}>
                <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                <Text style={styles.dateTxt}>{formatDateLabel(req.date)}</Text>
                <Text style={styles.ageTxt}>· {relativeDate(req.createdAt)}</Text>
              </View>

              {/* Reason */}
              <Text style={styles.reasonTxt}>{req.reason}</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.denyBtn, isActing && { opacity: 0.6 }]}
                  onPress={() => handleAction(req.id, 'deny')}
                  disabled={!!isActing}
                >
                  {isActing
                    ? <ActivityIndicator size="small" color={Colors.red} />
                    : <>
                        <MaterialIcons name="close" size={16} color={Colors.red} />
                        <Text style={styles.denyTxt}>Deny</Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveBtn, isActing && { opacity: 0.6 }]}
                  onPress={() => handleAction(req.id, 'approve')}
                  disabled={!!isActing}
                >
                  {isActing
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <>
                        <MaterialIcons name="check" size={16} color={Colors.white} />
                        <Text style={styles.approveTxt}>Approve</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
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
  listHeader: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
  card: {
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  userName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  userEmail: { fontSize: FontSize.xs, color: Colors.textSecondary, maxWidth: 160 },
  typeBadge: { borderRadius: Radii.full, paddingHorizontal: 9, paddingVertical: 3 },
  typeLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateTxt: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
  ageTxt: { fontSize: FontSize.xs, color: Colors.textMuted },
  reasonTxt: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  denyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: Colors.red, borderRadius: Radii.md, paddingVertical: 9,
  },
  denyTxt: { color: Colors.red, fontWeight: '600', fontSize: FontSize.sm },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: Colors.green, borderRadius: Radii.md, paddingVertical: 9,
  },
  approveTxt: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyTxt: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
});
