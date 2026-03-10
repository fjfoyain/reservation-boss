import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AppHeader from '@/components/AppHeader';

const TYPE_ICONS = { attendance: 'calendar_today', parking: 'local_parking', room: 'meeting_room' };
const TYPE_LABELS = { attendance: 'Office Attendance', parking: 'Parking', room: 'Meeting Room' };
const TABS = ['all', 'attendance', 'parking', 'room'];
const TAB_LABELS = { all: 'All Bookings', attendance: 'Office Attendance', parking: 'Parking', room: 'Meeting Rooms' };

function isSameDayOrFuture(dateStr) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  return dateStr >= today;
}

function isPastDeadlineForDate(dateStr, type) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  if (dateStr > today) return false;
  if (dateStr < today) return true;
  // Same day
  if (type === 'attendance') {
    // Attendance cutoff is Mon 11pm of that week — same day is always past
    return true;
  }
  // Parking + Room: 8am GYE cutoff
  const gyeNow = new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' });
  const hour = new Date(gyeNow).getHours();
  return hour >= 8;
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [cancelling, setCancelling] = useState('');
  const [toast, setToast] = useState('');
  const [lateModal, setLateModal] = useState(null); // { id, type, date, detail }
  const [lateReason, setLateReason] = useState('');
  const [submittingLate, setSubmittingLate] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.replace('/auth/login'); return; }
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      const res = await fetch('/api/v3/profile', { headers: { Authorization: `Bearer ${idToken}` } });
      if (!res.ok) { router.replace('/auth/login'); return; }
      setUser(await res.json());
    });
    return () => unsubscribe();
  }, [router]);

  const fetchBookings = useCallback(async (t = token) => {
    if (!t) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v3/my-bookings', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      setBookings(data.bookings || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchBookings(token); }, [token, fetchBookings]);

  async function handleCancel(booking) {
    const pastDeadline = isPastDeadlineForDate(booking.date, booking.type);
    if (pastDeadline) {
      setLateModal(booking);
      setLateReason('');
      return;
    }
    setCancelling(booking.id);
    try {
      let url;
      if (booking.type === 'attendance') url = `/api/v3/attendance/${booking.date}`;
      else if (booking.type === 'parking') url = `/api/v3/parking/${booking.id}`;
      else url = `/api/v3/room-reservations/${booking.id}`;

      const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (!res.ok && data.lateCancellation) {
        setLateModal(booking);
        setLateReason('');
      } else if (!res.ok) {
        showToast(data.error || 'Failed to cancel');
      } else {
        showToast('Cancelled successfully');
        fetchBookings();
      }
    } catch { showToast('Failed to cancel'); }
    setCancelling('');
  }

  async function submitLateRequest() {
    if (!lateReason.trim() || !lateModal) return;
    setSubmittingLate(true);
    try {
      const res = await fetch('/api/v3/late-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: lateModal.type,
          reservationId: lateModal.id,
          date: lateModal.date,
          reason: lateReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) showToast(data.error || 'Failed to submit request');
      else { showToast('Request submitted — pending admin approval'); setLateModal(null); fetchBookings(); }
    } catch { showToast('Failed to submit request'); }
    setSubmittingLate(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.type === tab);
  const upcoming = filtered.filter((b) => isSameDayOrFuture(b.date));
  const past = filtered.filter((b) => !isSameDayOrFuture(b.date));

  function BookingRow({ b }) {
    const isPast = !isSameDayOrFuture(b.date);
    const pastDeadline = isPastDeadlineForDate(b.date, b.type);
    const isFixed = b.fixed && b.type === 'parking';
    const isCancelling = cancelling === b.id;

    let statusBadge;
    let actionBtn;

    if (isPast) {
      statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Past</span>;
      actionBtn = null;
    } else if (b.lateRequestId) {
      statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Awaiting Approval</span>;
      actionBtn = <span className="text-xs text-gray-400 italic">Cancel Requested</span>;
    } else if (isFixed) {
      statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Permanent</span>;
      actionBtn = <span className="text-xs text-gray-400 italic">Non-cancellable</span>;
    } else if (pastDeadline) {
      statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Past Deadline</span>;
      actionBtn = (
        <button
          onClick={() => handleCancel(b)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          Request Late Cancel
        </button>
      );
    } else {
      statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Upcoming</span>;
      actionBtn = (
        <button
          onClick={() => handleCancel(b)}
          disabled={isCancelling}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {isCancelling ? 'Cancelling…' : 'Cancel'}
        </button>
      );
    }

    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{formatDate(b.date)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-gray-400">{TYPE_ICONS[b.type]}</span>
            <span className="text-sm text-gray-700">{TYPE_LABELS[b.type]}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{b.detail}</td>
        <td className="px-4 py-3">{statusBadge}</td>
        <td className="px-4 py-3 text-right">{actionBtn}</td>
      </tr>
    );
  }

  function Section({ title, rows }) {
    if (rows.length === 0) return null;
    return (
      <>
        <tr className="bg-gray-50">
          <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</td>
        </tr>
        {rows.map((b) => <BookingRow key={`${b.type}-${b.id}`} b={b} />)}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />

      <AppHeader
        user={user}
        activePage="my-bookings"
        onSignOut={() => signOut(auth).then(() => router.push('/auth/login'))}
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors ${
                tab === t ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              style={tab === t ? { backgroundColor: '#1183d4' } : {}}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-5xl">event_busy</span>
              <p className="mt-3 text-sm">No bookings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <Section title="Upcoming" rows={upcoming} />
                  <Section title="Past" rows={past} />
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            Parking and room cancellations after 8:00 AM on the day require admin approval.
            Attendance changes require admin approval after Monday 11:00 PM for that week.
          </div>
        </div>
      </main>

      {/* Late cancellation modal */}
      {lateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Request Late Cancellation</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {TYPE_LABELS[lateModal.type]} · {formatDate(lateModal.date)}
                </p>
              </div>
              <button onClick={() => setLateModal(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                Cancellations after the deadline require administrator approval. Please provide a reason.
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for late cancellation</label>
            <textarea
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="e.g. Illness, family emergency, client visit…"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setLateModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Keep Booking
              </button>
              <button
                onClick={submitLateRequest}
                disabled={submittingLate || !lateReason.trim()}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {submittingLate ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
