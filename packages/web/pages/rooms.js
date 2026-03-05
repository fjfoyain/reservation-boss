import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { generateTimeSlots, formatTimeSlot } from '@/lib/utils/roomHelpers';
import { toDateString, toGye } from '@/lib/utils/weekHelpersV3';

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
  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [lateModalData, setLateModalData] = useState(null);
  const [lateReason, setLateReason] = useState('');
  const [submittingLate, setSubmittingLate] = useState(false);

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

  async function handleCancel(reservationId, date) {
    try {
      const res = await fetch(`/api/v3/room-reservations/${reservationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { showToast('Booking cancelled'); fetchReservations(); return; }
      const data = await res.json();
      if (data.lateCancellation) {
        setLateModalData({ type: 'room', reservationId, date });
        setLateModalOpen(true);
      } else {
        showToast(data.error || 'Failed to cancel');
      }
    } catch { showToast('Failed to cancel'); }
  }

  async function submitLateRequest() {
    if (!lateModalData || !lateReason.trim()) return;
    setSubmittingLate(true);
    try {
      const res = await fetch('/api/v3/late-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lateModalData, reason: lateReason.trim() }),
      });
      if (res.ok) {
        showToast('Request submitted. Admins will review it.');
        setLateModalOpen(false); setLateReason(''); setLateModalData(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit request');
      }
    } catch { showToast('Failed to submit request'); }
    setSubmittingLate(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <span className="material-symbols-outlined text-5xl text-gray-300 animate-spin">progress_activity</span>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ color: '#112A46' }}>domain</span>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#112A46' }}>NORTH HIGHLAND</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
            <span className="text-sm font-medium border-b-2 pb-1" style={{ color: '#00A3E0', borderColor: '#00A3E0' }}>Rooms</span>
            <Link href="/my-requests" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">My Requests</Link>
            {user?.role === 'admin' && (
              <Link href="/admin" className="flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-md text-white transition-colors" style={{ backgroundColor: '#112A46' }}>
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                Admin
              </Link>
            )}
          </nav>
          <button
            onClick={() => signOut(auth).then(() => router.push('/auth/login'))}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Room Reservations</h1>
          <p className="mt-2 text-sm text-gray-500">Book meeting rooms and calling booths in 30-minute slots.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Room type tabs */}
          <div className="flex gap-2">
            {['meeting', 'calling'].map((t) => (
              <button
                key={t}
                onClick={() => setRoomType(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  roomType === t
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                style={roomType === t ? { backgroundColor: '#00A3E0', borderColor: '#00A3E0' } : {}}
              >
                <span className="material-symbols-outlined text-sm mr-1 align-middle">
                  {t === 'meeting' ? 'meeting_room' : 'phone_in_talk'}
                </span>
                {t === 'meeting' ? 'Meeting Rooms' : 'Calling Booths'}
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
            <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-5xl">meeting_room</span>
            <p className="mt-3 text-sm">No {roomType} rooms configured yet.</p>
            <p className="text-xs mt-1">Ask your admin to add rooms in the admin panel.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                              onClick={() => handleCancel(resId, selectedDate)}
                              className="w-full text-left px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
                              style={{ backgroundColor: '#eaf4fd', borderColor: '#1183d4', color: '#1183d4' }}
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

      {/* Late request modal */}
      {lateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Request Late Cancellation</h2>
            <p className="text-sm text-gray-500 mb-4">The 8:00 AM cancellation deadline has passed. Provide a reason and admins will review your request.</p>
            <textarea
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="Reason for late cancellation…"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => { setLateModalOpen(false); setLateReason(''); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={submitLateRequest}
                disabled={!lateReason.trim() || submittingLate}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {submittingLate ? 'Submitting…' : 'Submit Request'}
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
