import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Modal, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radii } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { todayEcuador, formatDateLabel, prevDay, nextDay, currentTimeEcuador } from '@/lib/weekHelpers';

interface Room { id: string; name: string; type: 'meeting' | 'calling' }
interface Reservation {
  id: string; userId: string; roomId: string;
  date: string; startTime: string; endTime: string; email: string;
}

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export default function RoomsScreen() {
  const [selectedDate, setSelectedDate] = useState(todayEcuador);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [booking, setBooking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadData = useCallback(async (date: string) => {
    try {
      const [roomsData, resData, profileData] = await Promise.all([
        apiFetch('/api/v3/rooms'),
        apiFetch(`/api/v3/room-reservations?date=${date}`),
        apiFetch('/api/v3/profile'),
      ]);
      setRooms(roomsData.rooms ?? []);
      setReservations(resData.reservations ?? []);
      setCurrentUserId(profileData.id ?? null);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load rooms');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData(selectedDate).finally(() => setLoading(false));
  }, [selectedDate, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(selectedDate);
    setRefreshing(false);
  }, [selectedDate, loadData]);

  function openBooking(room: Room) {
    setSelectedRoom(room);
    // For today, default to the next available slot (not in the past)
    const isToday = selectedDate === todayEcuador();
    const nowSlot = isToday ? currentTimeEcuador() : '00:00';
    const firstAvailable = TIME_SLOTS.find(t => t > nowSlot) ?? TIME_SLOTS[0];
    const secondAvailable = TIME_SLOTS.find(t => t > firstAvailable) ?? TIME_SLOTS[1];
    setStartTime(firstAvailable);
    setEndTime(secondAvailable);
    setShowModal(true);
  }

  async function submitBooking() {
    if (!selectedRoom) return;
    if (startTime >= endTime) {
      Alert.alert('Invalid time', 'End time must be after start time');
      return;
    }
    setBooking(true);
    try {
      await apiFetch('/api/v3/room-reservations', {
        method: 'POST',
        body: JSON.stringify({ roomId: selectedRoom.id, date: selectedDate, startTime, endTime }),
      });
      setShowModal(false);
      const resData = await apiFetch(`/api/v3/room-reservations?date=${selectedDate}`);
      setReservations(resData.reservations ?? []);
    } catch (err: any) {
      Alert.alert('Booking failed', err.message ?? 'Could not book room');
    } finally {
      setBooking(false);
    }
  }

  async function cancelReservation(id: string) {
    Alert.alert('Cancel booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel booking', style: 'destructive',
        onPress: async () => {
          setCancelling(id);
          try {
            await apiFetch(`/api/v3/room-reservations/${id}`, { method: 'DELETE' });
            const resData = await apiFetch(`/api/v3/room-reservations?date=${selectedDate}`);
            setReservations(resData.reservations ?? []);
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not cancel booking');
          } finally {
            setCancelling(null);
          }
        },
      },
    ]);
  }

  const isToday = selectedDate === todayEcuador();
  const minSlot = isToday ? currentTimeEcuador() : '00:00';
  const availableStartSlots = TIME_SLOTS.slice(0, -1).filter(t => t > minSlot);
  const endSlots = TIME_SLOTS.filter(t => t > startTime);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setSelectedDate(d => prevDay(d))} hitSlop={8}>
          <MaterialIcons name="chevron-left" size={28} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
        <TouchableOpacity onPress={() => setSelectedDate(d => nextDay(d))} hitSlop={8}>
          <MaterialIcons name="chevron-right" size={28} color={Colors.navy} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.teal} />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />}
          renderItem={({ item: room }) => {
            const roomRes = reservations.filter(r => r.roomId === room.id);
            return (
              <View style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <View style={styles.roomInfo}>
                    <View style={[styles.roomIcon, { backgroundColor: room.type === 'meeting' ? '#EFF6FF' : '#F0FDF4' }]}>
                      <MaterialIcons
                        name={room.type === 'meeting' ? 'meeting-room' : 'phone'}
                        size={20}
                        color={room.type === 'meeting' ? Colors.blue : Colors.green}
                      />
                    </View>
                    <View>
                      <Text style={styles.roomName}>{room.name}</Text>
                      <Text style={styles.roomType}>
                        {room.type === 'meeting' ? 'Meeting room' : 'Calling room'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.bookBtn} onPress={() => openBooking(room)}>
                    <Text style={styles.bookBtnTxt}>Book</Text>
                  </TouchableOpacity>
                </View>

                {roomRes.length > 0 ? (
                  <View style={styles.resList}>
                    {roomRes.map(r => (
                      <View key={r.id} style={styles.resRow}>
                        <MaterialIcons name="access-time" size={13} color={Colors.textSecondary} />
                        <Text style={styles.resTxt}>{r.startTime}–{r.endTime}</Text>
                        <Text style={styles.resEmail} numberOfLines={1}>{r.email}</Text>
                        {r.userId === currentUserId && (
                          <TouchableOpacity
                            onPress={() => cancelReservation(r.id)}
                            disabled={cancelling === r.id}
                            hitSlop={8}
                          >
                            {cancelling === r.id
                              ? <ActivityIndicator size="small" color={Colors.red} />
                              : <MaterialIcons name="close" size={16} color={Colors.red} />
                            }
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noBookings}>No bookings yet</Text>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book {selectedRoom?.name}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={8}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDate}>{formatDateLabel(selectedDate)}</Text>

            <Text style={styles.timeLabel}>Start time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
              {availableStartSlots.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, startTime === t && styles.timeChipActive]}
                  onPress={() => {
                    setStartTime(t);
                    const newEnd = TIME_SLOTS.find(s => s > t);
                    if (newEnd) setEndTime(newEnd);
                  }}
                >
                  <Text style={[styles.timeChipTxt, startTime === t && styles.timeChipActiveTxt]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.timeLabel}>End time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
              {endSlots.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, endTime === t && styles.timeChipActive]}
                  onPress={() => setEndTime(t)}
                >
                  <Text style={[styles.timeChipTxt, endTime === t && styles.timeChipActiveTxt]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, booking && { opacity: 0.6 }]}
              onPress={submitBooking}
              disabled={booking}
            >
              {booking
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={styles.submitTxt}>Confirm booking</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dateLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.navy },
  list: { padding: Spacing.md, gap: Spacing.md },
  roomCard: {
    backgroundColor: Colors.white, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  roomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  roomInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  roomIcon: { width: 40, height: 40, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  roomName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary },
  roomType: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  bookBtn: { backgroundColor: Colors.teal, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  bookBtnTxt: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  resList: { gap: 2 },
  resRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  resTxt: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500', minWidth: 80 },
  resEmail: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  noBookings: { fontSize: FontSize.sm, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    padding: Spacing.xl, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.navy },
  modalDate: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  timeLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  timeScroll: { marginBottom: Spacing.lg },
  timeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radii.full, borderWidth: 1.5, borderColor: Colors.border, marginRight: Spacing.xs,
  },
  timeChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  timeChipTxt: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  timeChipActiveTxt: { color: Colors.white },
  submitBtn: { backgroundColor: Colors.teal, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  submitTxt: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
