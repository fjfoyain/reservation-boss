import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, Alert, TouchableOpacity, Modal, TextInput,
  KeyboardAvoidingView, Platform,
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
  const [lateTarget, setLateTarget] = useState<Booking | null>(null);
  const [lateReason, setLateReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  function openLateRequest(b: Booking) {
    setLateTarget(b);
    setLateReason('');
  }

  async function submitLateRequest() {
    if (!lateTarget) return;
    if (!lateReason.trim()) {
      Alert.alert('Reason required', 'Please explain why you need this change.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/v3/late-requests', {
        method: 'POST',
        body: JSON.stringify({
          type: lateTarget.type,
          reservationId: lateTarget.id,
          date: lateTarget.date,
          reason: lateReason.trim(),
        }),
      });
      setLateTarget(null);
      Alert.alert('Request submitted', 'Your request has been sent to the admin for review.');
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
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
              const canRequestLate = !b.fixed && !b.lateRequestId && !canCancel;
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
                    {canRequestLate && (
                      <TouchableOpacity
                        style={styles.lateBtn}
                        onPress={() => openLateRequest(b)}
                        hitSlop={8}
                      >
                        <MaterialIcons name="edit-note" size={16} color={Colors.amber} />
                        <Text style={styles.lateBtnTxt}>Request change</Text>
                      </TouchableOpacity>
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
    <SafeAreaView style={styles.safe} edges={[]}>
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

      {/* Late request modal */}
      <Modal visible={!!lateTarget} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Request late change</Text>
                  {lateTarget && (
                    <Text style={styles.modalSub}>
                      {TYPE_META[lateTarget.type].label} · {formatDateLabel(lateTarget.date)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setLateTarget(null)} hitSlop={8}>
                  <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.reasonLabel}>Reason for change</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Explain why you need this change…"
                placeholderTextColor={Colors.textMuted}
                value={lateReason}
                onChangeText={setLateReason}
                multiline
                numberOfLines={4}
                maxLength={2000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{lateReason.length}/2000</Text>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={submitLateRequest}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.submitTxt}>Submit request</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  lateBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lateBtnTxt: { fontSize: FontSize.xs, color: Colors.amber, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary },
  emptyTxt: { fontSize: FontSize.sm, color: Colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    padding: Spacing.xl, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.navy },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  reasonLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  reasonInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md,
    padding: Spacing.md, fontSize: FontSize.base, color: Colors.textPrimary,
    minHeight: 110,
  },
  charCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: 4, marginBottom: Spacing.md },
  submitBtn: { backgroundColor: Colors.teal, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: 'center' },
  submitTxt: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
