import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const ALL_SPOTS = [
  'Parking 1', 'Parking 2', 'Parking 3', 'Parking 4', 'Parking 5',
  'Parking 6', 'Parking 7', 'Parking 8', 'Parking 9', 'Parking 10',
];

function Toggle({ checked, onChange, disabled: isDisabled }) {
  return (
    <label className={`relative flex h-6 w-11 cursor-pointer items-center rounded-full p-1 transition-colors ${checked ? '' : 'bg-gray-300'}`}
      style={checked ? { backgroundColor: '#1183d4' } : {}}
    >
      <div className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        disabled={isDisabled}
      />
    </label>
  );
}

export default function AdminParkingPage() {
  const [token, setToken] = useState('');
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);       // { weeklyLimit, cutoffTime, disabledSpots }
  const [blackouts, setBlackouts] = useState([]);   // [{ id, date, label }]
  const [loading, setLoading] = useState(true);

  // Global rules local state
  const [weeklyLimit, setWeeklyLimit] = useState(4);
  const [cutoffTime, setCutoffTime] = useState('08:00');
  const [savingRules, setSavingRules] = useState(false);

  // Spot toggles (local state — saved on "Save Spot Changes")
  const [disabledSpots, setDisabledSpots] = useState(new Set());
  const [savingSpots, setSavingSpots] = useState(false);

  // Blackout date form
  const [newBlackoutDate, setNewBlackoutDate] = useState('');
  const [newBlackoutLabel, setNewBlackoutLabel] = useState('');
  const [addingBlackout, setAddingBlackout] = useState(false);

  const [toast, setToast] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      const t = await firebaseUser.getIdToken();
      setToken(t);
      await Promise.all([fetchUsers(t), fetchConfig(t), fetchBlackouts(t)]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function fetchUsers(t = token) {
    const res = await fetch('/api/v3/admin/users', { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setUsers(data.users || []);
  }

  async function fetchConfig(t = token) {
    const res = await fetch('/api/v3/admin/parking-config', { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (data.config) {
      setConfig(data.config);
      setWeeklyLimit(data.config.weeklyLimit ?? 4);
      setCutoffTime(data.config.cutoffTime ?? '08:00');
      setDisabledSpots(new Set(data.config.disabledSpots ?? []));
    }
  }

  async function fetchBlackouts(t = token) {
    const res = await fetch('/api/v3/admin/parking-blackout', { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setBlackouts(data.dates || []);
  }

  function toggleSpot(spot) {
    setDisabledSpots((prev) => {
      const next = new Set(prev);
      if (next.has(spot)) next.delete(spot);
      else next.add(spot);
      return next;
    });
  }

  async function saveSpotChanges() {
    setSavingSpots(true);
    try {
      const res = await fetch('/api/v3/admin/parking-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabledSpots: [...disabledSpots] }),
      });
      if (res.ok) showToast('Spot configuration saved');
      else showToast('Failed to save');
    } catch { showToast('Failed to save'); }
    setSavingSpots(false);
  }

  async function saveRules() {
    setSavingRules(true);
    try {
      const res = await fetch('/api/v3/admin/parking-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyLimit: parseInt(weeklyLimit, 10), cutoffTime }),
      });
      if (res.ok) showToast('Global rules updated');
      else showToast('Failed to update rules');
    } catch { showToast('Failed to update rules'); }
    setSavingRules(false);
  }

  async function addBlackout() {
    if (!newBlackoutDate || !newBlackoutLabel.trim()) return;
    setAddingBlackout(true);
    try {
      const res = await fetch('/api/v3/admin/parking-blackout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newBlackoutDate, label: newBlackoutLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to add date'); }
      else {
        setBlackouts((prev) => [...prev, { id: data.id, date: data.date, label: data.label }].sort((a, b) => a.date.localeCompare(b.date)));
        setNewBlackoutDate('');
        setNewBlackoutLabel('');
        showToast('Blackout date added');
      }
    } catch { showToast('Failed to add date'); }
    setAddingBlackout(false);
  }

  async function removeBlackout(id) {
    try {
      const res = await fetch(`/api/v3/admin/parking-blackout/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlackouts((prev) => prev.filter((b) => b.id !== id));
        showToast('Date removed');
      }
    } catch { showToast('Failed to remove date'); }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  // Build spot assignments map
  const spotAssignments = {};
  users.filter((u) => u.role === 'internal' && u.internalSpot)
    .forEach((u) => { spotAssignments[u.internalSpot] = u; });

  const externalUsers = users.filter((u) => u.role === 'external' && u.active);
  const internalUsers = users.filter((u) => u.role === 'internal' && u.active);

  // Determine spot category (internal = has an assignment OR is Parking 6-10 by convention)
  const internalSpots = ALL_SPOTS.filter((s) => spotAssignments[s] || parseInt(s.split(' ')[1], 10) > 5);
  const externalSpots = ALL_SPOTS.filter((s) => !internalSpots.includes(s));

  if (loading) {
    return (
      <AdminLayout title="Parking Config">
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span>
        </div>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Parking Config">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Parking Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Manage spot availability, global reservation rules, and blackout dates.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spot Management */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Spot Management</h3>
              <p className="text-xs text-gray-500 mt-0.5">Toggle spots for maintenance or availability.</p>
            </div>
            <div className="flex-1">
              {/* Internal Spots */}
              <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Spots</span>
              </div>
              <div className="divide-y divide-gray-100">
                {ALL_SPOTS.filter((s) => parseInt(s.split(' ')[1], 10) > 5).map((spot) => {
                  const active = !disabledSpots.has(spot);
                  const assigned = spotAssignments[spot];
                  return (
                    <div key={spot} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 20 }}>
                          {active ? 'directions_car' : 'construction'}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${!active ? 'text-gray-400' : 'text-gray-900'}`}>{spot}</p>
                          {assigned && <p className="text-xs text-gray-400 truncate">{assigned.name}</p>}
                          {!assigned && <p className="text-xs text-amber-500">Unassigned</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className={`text-xs font-medium ${active ? 'text-emerald-600' : 'text-gray-400'}`}>{active ? 'Active' : 'Disabled'}</span>
                        <Toggle checked={active} onChange={() => toggleSpot(spot)} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* External Spots */}
              <div className="px-5 py-2 bg-gray-50 border-y border-gray-100 mt-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">External Spots</span>
              </div>
              <div className="divide-y divide-gray-100">
                {ALL_SPOTS.filter((s) => parseInt(s.split(' ')[1], 10) <= 5).map((spot) => {
                  const active = !disabledSpots.has(spot);
                  return (
                    <div key={spot} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 20 }}>
                          {active ? 'local_parking' : 'construction'}
                        </span>
                        <p className={`text-sm font-medium ${!active ? 'text-gray-400' : 'text-gray-900'}`}>{spot}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${active ? 'text-emerald-600' : 'text-gray-400'}`}>{active ? 'Active' : 'Disabled'}</span>
                        <Toggle checked={active} onChange={() => toggleSpot(spot)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={saveSpotChanges}
                disabled={savingSpots}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors"
                style={{ backgroundColor: '#1183d4' }}
              >
                {savingSpots ? 'Saving…' : 'Save Spot Changes'}
              </button>
            </div>
          </div>

          {/* Right column: Global Rules + Blackout Dates */}
          <div className="flex flex-col gap-6">
            {/* Global Rules */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Global Rules</h3>
              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>event_repeat</span>
                    Weekly Reservation Limit (Days/Week)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={weeklyLimit}
                      onChange={(e) => setWeeklyLimit(e.target.value)}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="text-xs text-gray-500">Max days an employee can reserve per week.</span>
                  </div>
                </div>
                <div className="border-t border-gray-100" />
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>schedule</span>
                    Same-Day Cancellation Cutoff
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={cutoffTime}
                      onChange={(e) => setCutoffTime(e.target.value)}
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="text-xs text-gray-500">After this time, cancellations require admin approval.</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={saveRules}
                  disabled={savingRules}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors"
                  style={{ backgroundColor: '#1183d4' }}
                >
                  {savingRules ? 'Updating…' : 'Update Rules'}
                </button>
              </div>
            </div>

            {/* Holiday / Blackout Dates */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Holiday / Blackout Dates</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Block reservations on office closure days.</p>
                </div>
              </div>

              {/* Add new blackout date */}
              <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <p className="text-xs font-medium text-gray-600">Add a blackout date</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={newBlackoutDate}
                    onChange={(e) => setNewBlackoutDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. Christmas Day)"
                    value={newBlackoutLabel}
                    onChange={(e) => setNewBlackoutLabel(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    onKeyDown={(e) => e.key === 'Enter' && addBlackout()}
                  />
                  <button
                    onClick={addBlackout}
                    disabled={addingBlackout || !newBlackoutDate || !newBlackoutLabel.trim()}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                    style={{ backgroundColor: '#1183d4' }}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {addingBlackout ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Blackout list */}
              {blackouts.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No blackout dates configured</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {blackouts.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{b.label}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(`${b.date}T12:00:00Z`).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => removeBlackout(b.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                        aria-label="Remove date"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Internal spot assignments summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Internal Spot Assignments</h3>
            <p className="text-xs text-gray-500 mt-0.5">Permanent assignments managed in{' '}
              <a href="/admin/users" className="text-blue-600 hover:underline">User Management</a>.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {ALL_SPOTS.filter((s) => parseInt(s.split(' ')[1], 10) > 5).map((spot) => {
              const assignedUser = spotAssignments[spot];
              const disabled = disabledSpots.has(spot);
              return (
                <div key={spot} className={`flex items-center justify-between px-5 py-3 ${disabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>
                      {disabled ? 'construction' : 'local_parking'}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{spot}</span>
                    {disabled && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Maintenance</span>}
                  </div>
                  {assignedUser ? (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{assignedUser.name}</p>
                      <p className="text-xs text-gray-400">{assignedUser.email}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-amber-600 font-medium">Unassigned</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {internalUsers.length} active internal users · {externalUsers.length} active external users
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
    </AdminLayout>
  );
}
