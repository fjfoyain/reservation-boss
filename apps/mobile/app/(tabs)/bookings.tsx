import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { formatDateLabel, todayEcuador } from '@/lib/weekHelpers';

interface Booking {
  id: string;
  type: 'attendance' | 'parking' | 'room';
  date: string;
  detail: string;
  fixed?: boolean;
  lateRequestId: string | null;
}

const TYPE_META = {
  attendance: { icon: 'event-available' as const, label: 'Attendance', color: Colors.navy },
  parking:    { icon: 'local-parking'   as const, label: 'Parking',    color: Colors.blue },
  room:       { icon: 'meeting-room'    as const, label: 'Room',       color: Colors.teal },
};

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const today = todayEcuador();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v3/my-bookings');
      setBookings(data.bookings ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load bookings');
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

  async function cancelBooking(b: Booking) {
    Alert.alert('Cancel booking', `Cancel this ${TYPE_META[b.type].label.toLowerCase()} for ${formatDateLabel(b.date)}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel', style: 'destructive',
        onPress: async () => {
          setCancelling(b.id);
          try {
            const endpoint = b.type === 'attendance' ? `/api/v3/attendance/${b.id}`
              : b.type === 'parking' ? `/api/v3/parking/${b.id}`
              : `/api/v3/room-reservations/${b.id}`;
            await apiFetch(endpoint, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not cancel booking');
          } finally {
            setCancelling(null);
          }
        },
      },
    ]);
  }

  const grouped = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    (acc[b.date] = acc[b.date] ?? []).push(b);
    return acc;
  }, {});
  const allDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const upcoming = allDates.filter(d => d >= today);
  const past = allDates.filter(d => d < today);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  function renderGroup(dates: string[], title: string) {
    if (!dates.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {dates.map(date => (
          <View key={date}>
            <Text style={styles.dateHeader}>{formatDateLabel(date)}</Text>
            {grouped[date].map(b => {
              const meta = TYPE_META[b.type];
              const canCancel = !b.fixed && date >= today && !b.lateRequestId;
              return (
                <View key={b.id} style={styles.bookingRow}>
                  <View style={[styles.typeBadge, { backgroundColor: meta.color + '18' }]}>
                    <MaterialIcons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingDetail}>{b.detail}</Text>
                    <Text style={styles.bookingType}>{meta.label}</Text>
                  </View>
                  <View style={styles.bookingRight}>
                    {b.lateRequestId && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingTxt}>Review pending</Text>
                      </View>
                    )}
                    {canCancel && (
                      <TouchableOpacity onPress={() => cancelBooking(b)} disabled={cancelling === b.id} hitSlop={8}>
                        {cancelling === b.id
                          ? <ActivityIndicator size="small" color={Colors.red} />
                          : <MaterialIcons name="delete-outline" size={20} color={Colors.red} />
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, !bookings.length && styles.scrollEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        {!bookings.length ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No bookings</Text>
            <Text style={styles.emptyTxt}>Your reservations will appear here</Text>
          </View>
        ) : (
          <>
            {renderGroup(upcoming, 'Upcoming')}
            {renderGroup(past, 'Past')}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.md },
  scrollEmpty: { flex: 1 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  dateHeader: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 4 },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.xs,
  },
  typeBadge: { width: 36, height: 36, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  bookingInfo: { flex: 1 },
  bookingDetail: { fontSize: FontSize.base, fontWeight: '500', color: Colors.textPrimary },
  bookingType: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  bookingRight: { alignItems: 'flex-end', gap: 4 },
  pendingBadge: { backgroundColor: Colors.amber + '22', borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 2 },
  pendingTxt: { fontSize: FontSize.xs, color: Colors.amber, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyTxt: { fontSize: FontSize.sm, color: Colors.textMuted },
});
