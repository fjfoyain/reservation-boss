import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AppHeader from '@/components/AppHeader';
import {
  getDefaultWeekMonday,
  getPrevMonday,
  getNextMonday,
  getWeekDates,
  isWeekEditable,
  canModifyParking,
  toDateString,
  toGye,
} from '@/lib/utils/weekHelpersV3';

// Always fetch a fresh token to avoid 401s after the 1-hour Firebase expiry
function getToken() {
  return auth.currentUser?.getIdToken();
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [weekMonday, setWeekMonday] = useState(getDefaultWeekMonday());
  const [weekDates, setWeekDates] = useState([]);
  const [attendance, setAttendance] = useState({}); // { 'YYYY-MM-DD': 'office' | 'remote' }
  const [parking, setParking] = useState({}); // { 'YYYY-MM-DD': { id, spot } }
  const [availableSpots, setAvailableSpots] = useState([]);
  const [spotSelections, setSpotSelections] = useState({}); // { date: spot }
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [lateModalData, setLateModalData] = useState(null);
  const [lateReason, setLateReason] = useState('');
  const [submittingLate, setSubmittingLate] = useState(false);
  const editable = isWeekEditable(weekMonday);

  // Auth guard
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace('/auth/login');
        return;
      }
      const idToken = await firebaseUser.getIdToken();

      const res = await fetch('/api/v3/profile', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        router.replace('/auth/login');
        return;
      }
      const profile = await res.json();
      // Admins can use the dashboard too (treated as internal parking)
      setUser(profile);

      // Load parking spots (names may be customized by admin)
      fetch('/api/v3/parking/spots', { headers: { Authorization: `Bearer ${idToken}` } })
        .then((r) => r.json())
        .then((d) => {
          const external = (d.spots || []).filter((s) => s.type === 'external').map((s) => s.name);
          setAvailableSpots(external);
        })
        .catch(() => {});
    });
    return () => unsubscribe();
  }, [router]);

  // Compute week dates whenever weekMonday changes
  useEffect(() => {
    setWeekDates(getWeekDates(weekMonday));
  }, [weekMonday]);

  // Fetch attendance + parking for the week
  const fetchWeekData = useCallback(async () => {
    if (!weekMonday) return;
    try {
      const t = await getToken();
      const [attRes, parkRes] = await Promise.all([
        fetch(`/api/v3/attendance/week?start=${weekMonday}`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`/api/v3/parking/week?start=${weekMonday}`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      ]);
      const attData = await attRes.json();
      const parkData = await parkRes.json();

      // Store { status, id } per date — id is needed for late requests when week is locked
      const attMap = {};
      (attData.attendance || []).forEach((a) => { attMap[a.date] = { status: a.status, id: a.id }; });
      setAttendance(attMap);

      const parkMap = {};
      (parkData.parking || []).forEach((p) => { parkMap[p.date] = { id: p.id, spot: p.spot }; });
      setParking(parkMap);
    } catch (err) {
      console.error('Failed to fetch week data:', err);
    }
  }, [weekMonday]);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  // Toggle attendance for a day
  function toggleAttendance(date) {
    const existing = attendance[date];
    if (!editable) {
      // Week is locked — open late request modal if there is an existing attendance record
      if (existing?.id) {
        setLateModalData({ type: 'attendance', reservationId: existing.id, date });
        setLateModalOpen(true);
      }
      return;
    }
    const current = existing?.status || 'remote';
    const next = current === 'office' ? 'remote' : 'office';
    setAttendance((prev) => ({ ...prev, [date]: { ...prev[date], status: next } }));
  }

  // Reserve parking for a day
  async function reserveParking(date) {
    const spot = spotSelections[date] || availableSpots[0];
    if (!spot) return;
    try {
      const t = await getToken();
      const res = await fetch('/api/v3/parking', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, spot }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to reserve parking');
        return;
      }
      setParking((prev) => ({ ...prev, [date]: { id: data.id, spot } }));
      showToast(`Parking reserved: ${spot}`);
    } catch {
      showToast('Failed to reserve parking');
    }
  }

  // Cancel parking
  async function cancelParking(date) {
    const entry = parking[date];
    if (!entry) return;
    if (!canModifyParking(date)) {
      // Past 8am — open late request modal
      setLateModalData({ type: 'parking', reservationId: entry.id, date });
      setLateModalOpen(true);
      return;
    }
    try {
      const t = await getToken();
      const res = await fetch(`/api/v3/parking/${entry.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const next = { ...parking };
        delete next[date];
        setParking(next);
        showToast('Parking reservation cancelled');
      } else {
        const data = await res.json();
        if (data.lateCancellation) {
          setLateModalData({ type: 'parking', reservationId: entry.id, date });
          setLateModalOpen(true);
        } else {
          showToast(data.error || 'Failed to cancel parking');
        }
      }
    } catch {
      showToast('Failed to cancel parking');
    }
  }

  // Save weekly schedule
  async function saveSchedule() {
    if (!editable) return;
    setSaving(true);
    try {
      const t = await getToken();
      const updates = weekDates.map(({ date }) => {
        const status = attendance[date]?.status || 'remote';
        return fetch('/api/v3/attendance', {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, status }),
        });
      });
      await Promise.all(updates);
      showToast('Schedule saved successfully!');
      fetchWeekData();
    } catch {
      showToast('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  }

  // Submit late request
  async function submitLateRequest() {
    if (!lateModalData || !lateReason.trim()) return;
    setSubmittingLate(true);
    try {
      const t = await getToken();
      const res = await fetch('/api/v3/late-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lateModalData, reason: lateReason.trim() }),
      });
      if (res.ok) {
        showToast('Request submitted. Admins will review it shortly.');
        setLateModalOpen(false);
        setLateReason('');
        setLateModalData(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit request');
      }
    } catch {
      showToast('Failed to submit request');
    } finally {
      setSubmittingLate(false);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push('/auth/login');
  }

  const officeDaysCount = weekDates.filter(({ date }) => attendance[date]?.status === 'office').length;
  const weeklyLimitReached = officeDaysCount >= 4;

  const weekLabel = weekDates.length
    ? `Week of ${weekDates[0]?.date ? new Date(`${weekDates[0].date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }) : ''} – ${weekDates[4]?.date ? new Date(`${weekDates[4].date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }) : ''}`
    : '';

  const today = toDateString(toGye());
  const maxFutureMonday = (() => {
    const d = new Date(`${getDefaultWeekMonday()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 28); // 4 weeks ahead
    return toDateString(d);
  })();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="material-symbols-outlined text-5xl text-gray-300 animate-spin">progress_activity</span>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Material Symbols */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />

      <AppHeader user={user} activePage="dashboard" onSignOut={handleSignOut} />

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Page header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Weekly Attendance</h1>
            <p className="mt-2 text-sm text-gray-500">Plan your office presence and manage reservations.</p>
          </div>
          {/* Weekly limit alert */}
          {weeklyLimitReached && editable && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-3 max-w-md">
              <span className="material-symbols-outlined text-amber-500 mt-0.5 text-xl">warning</span>
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Weekly Limit Reached</h3>
                <p className="text-xs text-amber-700 mt-1">
                  You&apos;ve scheduled <strong>4 office days</strong> this week — the maximum for parking reservations.
                </p>
              </div>
            </div>
          )}

          {/* Deadline banner */}
          {editable && !weeklyLimitReached && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 max-w-md">
              <span className="material-symbols-outlined text-amber-500 mt-0.5 text-xl">schedule</span>
              <div>
                <h3 className="text-sm font-medium text-amber-800">Update Deadline</h3>
                <p className="text-xs text-amber-700 mt-1">
                  Finalize your schedule by <strong>Monday at 11:00 PM</strong> for this week.
                </p>
              </div>
            </div>
          )}
          {!editable && (
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 flex items-start gap-3 max-w-md">
              <span className="material-symbols-outlined text-gray-500 mt-0.5 text-xl">lock</span>
              <div>
                <h3 className="text-sm font-medium text-gray-700">Schedule Locked</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This week is locked. Late changes require admin approval.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Week calendar card */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          {/* Week navigator */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setWeekMonday(getPrevMonday(weekMonday))}
              className="p-2 rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              aria-label="Previous week"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 hidden sm:block">calendar_month</span>
              <h2 className="text-base font-semibold text-gray-900">{weekLabel}</h2>
            </div>
            <button
              onClick={() => {
                const next = getNextMonday(weekMonday);
                if (next <= maxFutureMonday) setWeekMonday(next);
              }}
              className="p-2 rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              aria-label="Next week"
              disabled={getNextMonday(weekMonday) > maxFutureMonday}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          {/* Day rows */}
          <div className="divide-y divide-gray-200">
            {weekDates.map(({ date, label, dayNum }) => {
              const isOffice = attendance[date]?.status === 'office';
              const parkingEntry = parking[date];
              const isPast = date < today;
              const isToday = date === today;

              return (
                <div key={date} className={`p-6 transition-colors ${isPast ? 'opacity-60' : 'hover:bg-gray-50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Day tile */}
                    <div className="flex items-center gap-4">
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border ${isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-100'}`}>
                        <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
                        <span className={`text-lg font-bold ${isToday ? 'text-blue-600' : isOffice ? 'text-gray-900' : 'text-gray-500'}`}>{dayNum}</span>
                      </div>
                      <div>
                        <h3 className={`text-base font-medium ${isOffice ? 'text-gray-900' : 'text-gray-500'}`}>
                          {isOffice ? 'In Office' : 'Remote'}
                        </h3>
                        <p className="text-sm text-gray-400">{isOffice ? 'Quito Office' : 'Working from home'}</p>
                      </div>
                    </div>

                    {/* Attendance toggle */}
                    <div className="flex items-center gap-4 ml-18 sm:ml-0">
                      <label className={`relative inline-flex items-center ${!isPast ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isOffice}
                          onChange={() => !isPast && toggleAttendance(date)}
                          disabled={isPast}
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00A3E0]" />
                        <span className={`ml-3 text-sm font-medium min-w-[80px] ${isOffice ? 'text-gray-900' : 'text-gray-500'}`}>
                          {isOffice ? 'Attending' : 'Remote'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Parking sub-row for external users */}
                  {isOffice && user.role === 'external' && !isPast && (
                    <div className={`mt-4 rounded-lg p-4 border ${parkingEntry ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-100'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined mt-0.5 text-xl" style={{ color: '#00A3E0' }}>local_parking</span>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Parking Required?</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {parkingEntry
                                ? `Reserved: ${parkingEntry.spot}`
                                : 'Reserve an external spot for this day.'}
                            </p>
                          </div>
                        </div>
                        {parkingEntry ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
                              {parkingEntry.spot}
                            </span>
                            <button
                              onClick={() => cancelParking(date)}
                              className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors px-3 py-1.5 rounded hover:bg-red-50"
                              aria-label={`Cancel parking for ${date}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <select
                              value={spotSelections[date] || ''}
                              onChange={(e) => setSpotSelections((prev) => ({ ...prev, [date]: e.target.value }))}
                              className="block w-full sm:w-44 rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="">Select spot…</option>
                              {availableSpots.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => reserveParking(date)}
                              className="px-4 py-2 rounded-md text-white text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
                              style={{ backgroundColor: '#00A3E0' }}
                            >
                              Reserve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Internal parking label */}
                  {isOffice && user.role === 'internal' && (
                    <div className="mt-4 rounded-lg p-4 border bg-gray-50 border-gray-200">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined mt-0.5 text-xl text-gray-500">local_parking</span>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Your Assigned Parking Spot</h4>
                          <p className="text-xs text-gray-500 mt-1">{user.internalSpot || 'Not assigned yet — contact admin'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save button */}
          {editable && (
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={saveSchedule}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-md text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#112A46' }}
              >
                <span className="material-symbols-outlined text-lg">save</span>
                {saving ? 'Saving…' : 'Save Weekly Schedule'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#112A46' }} className="text-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">domain</span>
            <span className="font-bold tracking-tight">NORTH HIGHLAND</span>
          </div>
          <div className="text-sm text-gray-300">© {new Date().getFullYear()} North Highland. Internal use only.</div>
        </div>
      </footer>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-50 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {toast}
        </div>
      )}

      {/* Late request modal */}
      {lateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Request Late Change</h2>
            <p className="text-sm text-gray-500 mb-4">
              This change is past the deadline. Please provide a reason and admins will review your request.
            </p>
            <textarea
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="Reason for late cancellation (e.g., medical emergency, car trouble)…"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-blue-500 resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => { setLateModalOpen(false); setLateReason(''); setLateModalData(null); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
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
    </div>
  );
}
