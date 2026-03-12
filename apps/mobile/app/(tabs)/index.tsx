import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import {
  getDefaultWeekMonday, getWeekDates, getPrevMonday, getNextMonday,
  isWeekEditable, formatWeekHeader, todayEcuador, canModifyParking,
} from '@/lib/weekHelpers';

interface AttendanceRecord { id: string; date: string; status: 'office' | 'remote' }
interface ParkingRecord { id: string; date: string; spot: string }
interface Profile { role: string; internalSpot: string | null; name: string }

export default function DashboardScreen() {
  const [weekMonday, setWeekMonday] = useState(getDefaultWeekMonday);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [parking, setParking] = useState<Record<string, ParkingRecord>>({});
  const [availableSpots, setAvailableSpots] = useState<string[]>([]);
  const [takenSpotsByDate, setTakenSpotsByDate] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [parkModal, setParkModal] = useState<string | null>(null); // date for modal
  const [reservingSpot, setReservingSpot] = useState<string | null>(null);
  const [cancellingPark, setCancellingPark] = useState<string | null>(null);
  const [parkingCutoff, setParkingCutoff] = useState('08:00');

  const weekDates = getWeekDates(weekMonday);
  const editable = isWeekEditable(weekMonday);
  const today = todayEcuador();
  const MIN_OFFICE_DAYS = 3;
  const officeDaysCount = weekDates.filter(({ date }) => attendance[date]?.status === 'office').length;
  const noShowDays = Math.max(0, MIN_OFFICE_DAYS - officeDaysCount);

  const loadData = useCallback(async (monday: string) => {
    try {
      const [profileData, attData, parkData, spotsData, configData] = await Promise.all([
        apiFetch('/api/v3/profile'),
        apiFetch(`/api/v3/attendance/week?start=${monday}`),
        apiFetch(`/api/v3/parking/week?start=${monday}`),
        apiFetch('/api/v3/parking/spots'),
        apiFetch('/api/v3/parking/config').catch(() => null),
      ]);
      if (configData?.config?.cutoffTime) setParkingCutoff(configData.config.cutoffTime);
      setProfile(profileData);
      const attMap: Record<string, AttendanceRecord> = {};
      (attData.attendance ?? []).forEach((a: AttendanceRecord) => { attMap[a.date] = a; });
      setAttendance(attMap);
      const parkMap: Record<string, ParkingRecord> = {};
      (parkData.parking ?? []).forEach((p: ParkingRecord) => { parkMap[p.date] = p; });
      setParking(parkMap);
      const external = (spotsData.spots ?? [])
        .filter((s: { name: string; type: string }) => s.type === 'external')
        .map((s: { name: string }) => s.name);
      setAvailableSpots(external);

      // Fetch taken spots for each day of the week
      const dates = getWeekDates(monday);
      const takenResults = await Promise.all(
        dates.map(({ date }) =>
          apiFetch(`/api/v3/parking/availability?date=${date}`).catch(() => ({ takenSpots: [] }))
        )
      );
      const takenMap: Record<string, string[]> = {};
      dates.forEach(({ date }, i) => { takenMap[date] = takenResults[i].takenSpots ?? []; });
      setTakenSpotsByDate(takenMap);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load data');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData(weekMonday).finally(() => setLoading(false));
  }, [weekMonday, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(weekMonday);
    setRefreshing(false);
  }, [weekMonday, loadData]);

  async function setAttendanceStatus(date: string, status: 'office' | 'remote') {
    if (!editable) return;
    setSaving(s => ({ ...s, [date]: true }));
    try {
      await apiFetch('/api/v3/attendance', {
        method: 'POST',
        body: JSON.stringify({ date, status }),
      });
      const updated = await apiFetch(`/api/v3/attendance/week?start=${weekMonday}`);
      const attMap: Record<string, AttendanceRecord> = {};
      (updated.attendance ?? []).forEach((a: AttendanceRecord) => { attMap[a.date] = a; });
      setAttendance(attMap);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not update attendance');
    } finally {
      setSaving(s => ({ ...s, [date]: false }));
    }
  }

  async function reserveParking(date: string, spot: string) {
    setReservingSpot(spot);
    try {
      const result = await apiFetch('/api/v3/parking', {
        method: 'POST',
        body: JSON.stringify({ date, spot }),
      });
      setParking(prev => ({ ...prev, [date]: { id: result.id, date, spot } }));
      setParkModal(null);
    } catch (err: any) {
      Alert.alert('Reservation failed', err.message ?? 'Could not reserve spot');
    } finally {
      setReservingSpot(null);
    }
  }

  async function cancelParking(date: string) {
    const park = parking[date];
    if (!park) return;
    Alert.alert('Cancel parking', `Cancel parking spot ${park.spot} for this day?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel', style: 'destructive',
        onPress: async () => {
          setCancellingPark(date);
          try {
            await apiFetch(`/api/v3/parking/${park.id}`, { method: 'DELETE' });
            setParking(prev => {
              const next = { ...prev };
              delete next[date];
              return next;
            });
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not cancel parking');
          } finally {
            setCancellingPark(null);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  const isExternal = profile?.role === 'external';
  const isInternal = profile?.role === 'internal';

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekMonday(getPrevMonday(weekMonday))} hitSlop={8}>
          <MaterialIcons name="chevron-left" size={28} color={Colors.navy} />
        </TouchableOpacity>
        <View style={styles.weekCenter}>
          <Text style={styles.weekLabel}>{formatWeekHeader(weekMonday)}</Text>
          {!editable && (
            <View style={styles.lockedBadge}>
              <MaterialIcons name="lock" size={11} color={Colors.white} />
              <Text style={styles.lockedText}>Locked</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setWeekMonday(getNextMonday(weekMonday))} hitSlop={8}>
          <MaterialIcons name="chevron-right" size={28} color={Colors.navy} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
      >
        {noShowDays > 0 && (
          <View style={styles.noShowBanner}>
            <MaterialIcons name="event-busy" size={18} color="#DC2626" />
            <Text style={styles.noShowText}>
              {officeDaysCount} office day{officeDaysCount !== 1 ? 's' : ''} scheduled — minimum is {MIN_OFFICE_DAYS}.{' '}
              <Text style={styles.noShowBold}>{noShowDays} no-show day{noShowDays !== 1 ? 's' : ''}</Text> will be recorded.
            </Text>
          </View>
        )}
        {weekDates.map(({ date, label, dayNum }) => {
          const att = attendance[date];
          const park = parking[date];
          const isToday = date === today;
          const isSaving = saving[date];
          const isCancellingPark = cancellingPark === date;

          // Parking section logic
          const parkModifiable = canModifyParking(date, parkingCutoff); // false if today after cutoff or past
          const taken = takenSpotsByDate[date] ?? [];
          const freeSpots = availableSpots.filter(s => !taken.includes(s));
          const allSpotsTaken = freeSpots.length === 0;
          const showParkReserve = isExternal && editable && parkModifiable && att?.status === 'office' && !park && !allSpotsTaken;
          const showParkFull = isExternal && editable && parkModifiable && att?.status === 'office' && !park && allSpotsTaken;
          const canCancelPark = isExternal && editable && parkModifiable && !!park;

          return (
            <View key={date} style={[styles.dayCard, isToday && styles.todayCard]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, isToday && styles.todayText]}>{label}</Text>
                <Text style={[styles.dayNum, isToday && styles.todayText]}>{dayNum}</Text>
                {isToday && <View style={styles.todayDot} />}
              </View>

              <View style={styles.dayBody}>
                {/* Attendance toggle */}
                {editable ? (
                  <View style={styles.toggleRow}>
                    {isSaving && <ActivityIndicator size="small" color={Colors.teal} />}
                    <TouchableOpacity
                      style={[styles.toggleBtn, att?.status === 'office' && styles.toggleActive]}
                      onPress={() => setAttendanceStatus(date, 'office')}
                      disabled={!!isSaving}
                    >
                      <MaterialIcons name="business" size={14}
                        color={att?.status === 'office' ? Colors.white : Colors.textSecondary} />
                      <Text style={[styles.toggleTxt, att?.status === 'office' && styles.toggleActiveTxt]}>
                        Office
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, att?.status === 'remote' && styles.toggleRemote]}
                      onPress={() => setAttendanceStatus(date, 'remote')}
                      disabled={!!isSaving}
                    >
                      <MaterialIcons name="home" size={14}
                        color={att?.status === 'remote' ? Colors.white : Colors.textSecondary} />
                      <Text style={[styles.toggleTxt, att?.status === 'remote' && styles.toggleActiveTxt]}>
                        Remote
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.statusPill}>
                    <MaterialIcons
                      name={att?.status === 'remote' ? 'home' : att?.status === 'office' ? 'business' : 'help-outline'}
                      size={13}
                      color={att?.status === 'office' ? Colors.navy : att?.status === 'remote' ? Colors.teal : Colors.textMuted}
                    />
                    <Text style={[
                      styles.statusTxt,
                      att?.status === 'office' && { color: Colors.navy },
                      att?.status === 'remote' && { color: Colors.teal },
                      !att?.status && { color: Colors.textMuted },
                    ]}>
                      {att?.status === 'office' ? 'Office' : att?.status === 'remote' ? 'Remote' : 'Not set'}
                    </Text>
                  </View>
                )}

                {/* Parking section */}
                {isInternal && profile?.internalSpot ? (
                  <View style={styles.parkBadge}>
                    <MaterialIcons name="local-parking" size={12} color={Colors.blue} />
                    <Text style={styles.parkTxt}>{profile.internalSpot} (fixed)</Text>
                  </View>
                ) : park ? (
                  <View style={styles.parkRow}>
                    <View style={styles.parkBadge}>
                      <MaterialIcons name="local-parking" size={12} color={Colors.blue} />
                      <Text style={styles.parkTxt}>{park.spot}</Text>
                    </View>
                    {canCancelPark && (
                      <TouchableOpacity
                        onPress={() => cancelParking(date)}
                        disabled={isCancellingPark}
                        hitSlop={8}
                        style={styles.parkCancelBtn}
                      >
                        {isCancellingPark
                          ? <ActivityIndicator size="small" color={Colors.red} />
                          : <MaterialIcons name="close" size={14} color={Colors.red} />
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                ) : showParkReserve ? (
                  <TouchableOpacity
                    style={styles.reserveParkBtn}
                    onPress={() => setParkModal(date)}
                  >
                    <MaterialIcons name="local-parking" size={12} color={Colors.teal} />
                    <Text style={styles.reserveParkTxt}>Reserve parking</Text>
                  </TouchableOpacity>
                ) : showParkFull ? (
                  <View style={[styles.parkBadge, styles.parkFull]}>
                    <MaterialIcons name="block" size={12} color="#DC2626" />
                    <Text style={[styles.parkTxt, { color: '#DC2626' }]}>No spots available</Text>
                  </View>
                ) : isExternal && !park && att?.status !== 'remote' ? (
                  <View style={[styles.parkBadge, styles.parkNone]}>
                    <MaterialIcons name="local-parking" size={12} color={Colors.textMuted} />
                    <Text style={[styles.parkTxt, { color: Colors.textMuted }]}>No parking</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Spot picker modal */}
      <Modal visible={!!parkModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reserve parking</Text>
              <TouchableOpacity onPress={() => setParkModal(null)} hitSlop={8}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Select an available spot</Text>
            {(() => {
              const taken = parkModal ? (takenSpotsByDate[parkModal] ?? []) : [];
              const freeModalSpots = availableSpots.filter(s => !taken.includes(s));
              if (freeModalSpots.length === 0) {
                return (
                  <View style={styles.noSpots}>
                    <MaterialIcons name="do-not-disturb" size={32} color={Colors.border} />
                    <Text style={styles.noSpotsTxt}>No spots available</Text>
                  </View>
                );
              }
              return (
                <FlatList
                  data={freeModalSpots}
                  keyExtractor={s => s}
                  style={styles.spotList}
                  renderItem={({ item: spot }) => (
                    <TouchableOpacity
                      style={[styles.spotRow, reservingSpot === spot && { opacity: 0.5 }]}
                      onPress={() => parkModal && reserveParking(parkModal, spot)}
                      disabled={!!reservingSpot}
                    >
                      <View style={styles.spotIcon}>
                        <MaterialIcons name="local-parking" size={18} color={Colors.blue} />
                      </View>
                      <Text style={styles.spotName}>{spot}</Text>
                      {reservingSpot === spot
                        ? <ActivityIndicator size="small" color={Colors.teal} />
                        : <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
                      }
                    </TouchableOpacity>
                  )}
                />
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  weekNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  weekCenter: { alignItems: 'center', gap: 4 },
  weekLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.navy },
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.textMuted, borderRadius: Radii.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  lockedText: { fontSize: FontSize.xs, color: Colors.white, fontWeight: '600' },
  scroll: { padding: Spacing.md, gap: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md,
  },
  todayCard: { borderColor: Colors.teal, borderWidth: 2 },
  dayHeader: { width: 44, alignItems: 'center', gap: 2 },
  dayLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase' },
  dayNum: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.navy },
  todayText: { color: Colors.teal },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.teal },
  dayBody: { flex: 1, gap: Spacing.xs },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radii.full, borderWidth: 1.5, borderColor: Colors.border,
  },
  toggleActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  toggleRemote: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  toggleTxt: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  toggleActiveTxt: { color: Colors.white },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  statusTxt: { fontSize: FontSize.sm, fontWeight: '500' },
  parkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  parkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: Radii.full,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  parkNone: { backgroundColor: Colors.background },
  parkFull: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 },
  parkTxt: { fontSize: FontSize.xs, color: Colors.blue, fontWeight: '500' },
  parkCancelBtn: { padding: 3 },
  reserveParkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: Colors.teal, borderRadius: Radii.full,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  reserveParkTxt: { fontSize: FontSize.xs, color: Colors.teal, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    padding: Spacing.xl, paddingBottom: 40, maxHeight: '70%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.navy },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  spotList: { flex: 1 },
  spotRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  spotIcon: {
    width: 36, height: 36, borderRadius: Radii.md,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  spotName: { flex: 1, fontSize: FontSize.base, fontWeight: '500', color: Colors.textPrimary },
  noSpots: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  noSpotsTxt: { fontSize: FontSize.sm, color: Colors.textMuted },
  noShowBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FEF2F2', borderRadius: Radii.lg, borderWidth: 1, borderColor: '#FECACA',
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  noShowText: { flex: 1, fontSize: FontSize.xs, color: '#991B1B' },
  noShowBold: { fontWeight: '700' },
});
