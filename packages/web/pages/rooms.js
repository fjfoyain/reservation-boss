import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { generateTimeSlots, formatTimeSlot } from '@/lib/utils/roomHelpers';
import { toDateString, toGye } from '@/lib/utils/weekHelpersV3';
import AppHeader from '@/components/AppHeader';

const TIME_SLOTS = generateTimeSlots(8, 18, 30);

function getWeekdayDates(numDays = 7) {
  const now = toGye();
  const today = toDateString(now);
  const dates = [];
  let d = new Date();
  while (dates.length < numDays) {
    const str = toDateString(toGye(d));
    const dow = toGye(d).getDay();
    if (dow >= 1 && dow <= 5) dates.push(str); // Mon–Fri only
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export default function RoomsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [rooms, setRooms] = useState([]);
  const [roomType, setRoomType] = useState('meeting');
  const [selectedDate, setSelectedDate] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { room, slot }
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null); // reservation id to confirm cancel

  const weekdayDates = getWeekdayDates(14); // next 14 weekdays
  const today = toDateString(toGye());

  // Auth guard
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.replace('/auth/login'); return; }
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      const res = await fetch('/api/v3/profile', { headers: { Authorization: `Bearer ${idToken}` } });
      if (!res.ok) { router.replace('/auth/login'); return; }
      const profile = await res.json();
      setUser(profile);
      setSelectedDate(today);
    });
    return () => unsubscribe();
  }, [router, today]);

  // Fetch active rooms when type changes
  useEffect(() => {
    if (!token) return;
    setLoadingRooms(true);
    fetch(`/api/v3/rooms?type=${roomType}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setRooms(data.rooms || []); setLoadingRooms(false); })
      .catch(() => setLoadingRooms(false));
  }, [token, roomType]);

  // Fetch reservations for selected date + type
  const fetchReservations = useCallback(async () => {
    if (!token || !selectedDate) return;
    setLoadingSlots(true);
    const res = await fetch(`/api/v3/room-reservations?date=${selectedDate}&roomType=${roomType}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setReservations(data.reservations || []);
    setLoadingSlots(false);
  }, [token, selectedDate, roomType]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  function getSlotStatus(roomId, slot) {
    const booking = reservations.find(
      (r) => r.roomId === roomId && r.startTime === slot.start && r.endTime === slot.end
    );
    if (!booking) return { status: 'available' };
    if (booking.userId === user?.uid) return { status: 'mine', id: booking.id };
    return { status: 'taken', name: booking.userName };
  }

  async function handleBook(room, slot) {
    setBooking(true);
    try {
      const res = await fetch('/api/v3/room-reservations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, date: selectedDate, startTime: slot.start, endTime: slot.end }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to book slot'); }
      else { showToast(`Booked: ${room.name} ${formatTimeSlot(slot.start, slot.end)}`); fetchReservations(); }
    } catch { showToast('Failed to book slot'); }
    setBooking(false);
    setConfirmModal(null);
  }

  async function handleCancel(reservationId) {
    setCancelConfirm(null);
    try {
      const res = await fetch(`/api/v3/room-reservations/${reservationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) { showToast('Booking cancelled'); fetchReservations(); return; }
      if (data.lateCancellation) {
        showToast('Cancellation deadline passed (8 AM). Use My Bookings to request a late cancellation.');
      } else {
        showToast(data.error || 'Failed to cancel');
      }
    } catch { showToast('Failed to cancel'); }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="css-spinner"></div>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />

      <AppHeader
        user={user}
        activePage="rooms"
        onSignOut={() => signOut(auth).then(() => router.push('/auth/login'))}
      />

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Room Reservations</h1>
          <p className="mt-2 text-sm text-gray-500">Book meeting rooms and calling booths in 30-minute slots.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Room type tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'meeting', label: 'Meeting Rooms', icon: 'meeting_room' },
              { key: 'calling', label: 'Calling Booths', icon: 'phone_in_talk' },
              { key: 'conference', label: 'Conference Rooms', icon: 'groups' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setRoomType(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  roomType === key
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                style={roomType === key ? { backgroundColor: '#00A3E0', borderColor: '#00A3E0' } : {}}
              >
                <span className="material-symbols-outlined text-sm mr-1 align-middle">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Date selector */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="material-symbols-outlined text-gray-400">calendar_today</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm text-gray-700 bg-white px-3 py-2 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#1183d4' }}
            >
              {weekdayDates.map((d) => {
                const label = new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
                });
                return <option key={d} value={d}>{label}{d === today ? ' (Today)' : ''}</option>;
              })}
            </select>
          </div>
        </div>

        {/* Room availability grid */}
        {loadingRooms ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="css-spinner"></div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-5xl">meeting_room</span>
            <p className="mt-3 text-sm">No {roomType} rooms configured yet.</p>
            <p className="text-xs mt-1">Ask your admin to add rooms in the admin panel.</p>
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-32">Time</th>
                  {rooms.map((room) => (
                    <th key={room.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[140px]">
                      <div>{room.name}</div>
                      {room.capacity && <div className="text-gray-400 font-normal normal-case">Cap: {room.capacity}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot.start} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-xs text-gray-500 font-medium whitespace-nowrap">
                      {slot.start}
                    </td>
                    {rooms.map((room) => {
                      const { status, id: resId, name: takenBy } = getSlotStatus(room.id, slot);
                      return (
                        <td key={room.id} className="px-2 py-1.5">
                          {status === 'available' && (
                            <button
                              onClick={() => setConfirmModal({ room, slot })}
                              className="w-full text-left px-3 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                            >
                              Available
                            </button>
                          )}
                          {status === 'mine' && (
                            <button
                              onClick={() => setCancelConfirm(resId)}
                              className="w-full text-left px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
                              style={{ backgroundColor: '#eaf4fd', borderColor: '#1183d4', color: '#1183d4' }}
                              aria-label={`Cancel booking for ${room.name} at ${slot.start}`}
                            >
                              <span className="material-symbols-outlined text-xs mr-1 align-middle">person</span>
                              My Booking
                            </button>
                          )}
                          {status === 'taken' && (
                            <div className="px-3 py-1.5 rounded-md text-xs bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
                              Booked
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card per room with time slots */}
          <div className="sm:hidden space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">{room.name}</h3>
                  {room.capacity && <p className="text-xs text-gray-400">Capacity: {room.capacity}</p>}
                </div>
                <div className="divide-y divide-gray-100">
                  {TIME_SLOTS.map((slot) => {
                    const { status, id: resId } = getSlotStatus(room.id, slot);
                    return (
                      <div key={slot.start} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-gray-500 font-medium w-20">{formatTimeSlot(slot.start, slot.end)}</span>
                        {status === 'available' && (
                          <button
                            onClick={() => setConfirmModal({ room, slot })}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 active:bg-green-100 transition-colors"
                          >
                            Book
                          </button>
                        )}
                        {status === 'mine' && (
                          <button
                            onClick={() => setCancelConfirm(resId)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
                            style={{ backgroundColor: '#eaf4fd', borderColor: '#1183d4', color: '#1183d4' }}
                          >
                            My Booking
                          </button>
                        )}
                        {status === 'taken' && (
                          <span className="px-3 py-1.5 rounded-md text-xs bg-gray-100 text-gray-400 border border-gray-200">
                            Booked
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#112A46' }} className="text-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">domain</span>
            <span className="font-bold tracking-tight">NORTH HIGHLAND</span>
          </div>
          <div className="text-sm text-gray-300">© {new Date().getFullYear()} North Highland. Internal use only.</div>
        </div>
      </footer>

      {/* Confirm booking modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Booking</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-700 space-y-1">
              <div><span className="font-medium">Room:</span> {confirmModal.room.name}</div>
              <div><span className="font-medium">Date:</span> {new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}</div>
              <div><span className="font-medium">Time:</span> {formatTimeSlot(confirmModal.slot.start, confirmModal.slot.end)}</div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => handleBook(confirmModal.room, confirmModal.slot)}
                disabled={booking}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {booking ? 'Booking…' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Cancel Booking?</h2>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to cancel this room reservation?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCancelConfirm(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Keep Booking
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm)}
                className="px-4 py-2 text-sm text-white rounded-lg bg-red-600 hover:bg-red-700"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-50 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
}
