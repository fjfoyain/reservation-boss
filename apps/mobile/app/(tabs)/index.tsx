import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import {
  getDefaultWeekMonday, getWeekDates, getPrevMonday, getNextMonday,
  isWeekEditable, formatWeekHeader, todayEcuador,
} from '@/lib/weekHelpers';

interface AttendanceRecord { id: string; date: string; status: 'office' | 'remote' }
interface ParkingRecord { id: string; date: string; spot: string }
interface Profile { role: string; internalSpot: string | null; name: string }

export default function DashboardScreen() {
  const [weekMonday, setWeekMonday] = useState(getDefaultWeekMonday);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [parking, setParking] = useState<Record<string, ParkingRecord>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const weekDates = getWeekDates(weekMonday);
  const editable = isWeekEditable(weekMonday);
  const today = todayEcuador();

  const loadData = useCallback(async (monday: string) => {
    try {
      const [profileData, attData, parkData] = await Promise.all([
        apiFetch('/api/v3/profile'),
        apiFetch(`/api/v3/attendance/week?start=${monday}`),
        apiFetch(`/api/v3/parking/week?start=${monday}`),
      ]);
      setProfile(profileData);
      const attMap: Record<string, AttendanceRecord> = {};
      (attData.attendance ?? []).forEach((a: AttendanceRecord) => { attMap[a.date] = a; });
      setAttendance(attMap);
      const parkMap: Record<string, ParkingRecord> = {};
      (parkData.parking ?? []).forEach((p: ParkingRecord) => { parkMap[p.date] = p; });
      setParking(parkMap);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
        {weekDates.map(({ date, label, dayNum }) => {
          const att = attendance[date];
          const park = parking[date];
          const isToday = date === today;
          const isSaving = saving[date];
          const isInternal = profile?.role === 'internal';
          const internalSpot = profile?.internalSpot;

          return (
            <View key={date} style={[styles.dayCard, isToday && styles.todayCard]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, isToday && styles.todayText]}>{label}</Text>
                <Text style={[styles.dayNum, isToday && styles.todayText]}>{dayNum}</Text>
                {isToday && <View style={styles.todayDot} />}
              </View>

              <View style={styles.dayBody}>
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

                {isInternal && internalSpot ? (
                  <View style={styles.parkBadge}>
                    <MaterialIcons name="local-parking" size={12} color={Colors.blue} />
                    <Text style={styles.parkTxt}>{internalSpot} (fixed)</Text>
                  </View>
                ) : !isInternal && park ? (
                  <View style={styles.parkBadge}>
                    <MaterialIcons name="local-parking" size={12} color={Colors.blue} />
                    <Text style={styles.parkTxt}>{park.spot}</Text>
                  </View>
                ) : !isInternal ? (
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
  parkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: Radii.full,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  parkNone: { backgroundColor: Colors.background },
  parkTxt: { fontSize: FontSize.xs, color: Colors.blue, fontWeight: '500' },
});
