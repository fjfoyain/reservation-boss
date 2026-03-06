import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const PARKING_LABELS = {
  internal: { label: 'Internal', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  external: { label: 'External', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  none: { label: 'No Parking', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

const PARKING_FILTERS = ['all', 'internal', 'external', 'none'];

function isAdminUser(u) {
  return u.isAdmin === true || u.role === 'admin';
}

function getParkingType(u) {
  // Legacy: if role === 'admin', parking type defaults to 'none'
  if (u.role === 'admin') return 'none';
  return u.role || 'none';
}

export default function AdminUsersPage() {
  const [token, setToken] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterParking, setFilterParking] = useState('all');
  const [filterAdmin, setFilterAdmin] = useState('all'); // 'all' | 'admin' | 'user'
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [takenSpots, setTakenSpots] = useState(new Set());
  const [internalSpots, setInternalSpots] = useState([]);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Attendance rules
  const [scheduleDeadlineTime, setScheduleDeadlineTime] = useState('23:00');
  const [weekSwitchTime, setWeekSwitchTime] = useState('17:00');
  const [savingAttRules, setSavingAttRules] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      fetchUsers(idToken);
      fetchAttendanceConfig(idToken);
      fetch('/api/v3/admin/parking-config', { headers: { Authorization: `Bearer ${idToken}` } })
        .then((r) => r.json())
        .then((d) => {
          const spots = (d.config?.spots || []).filter((s) => s.type === 'internal').map((s) => s.name);
          setInternalSpots(spots);
        })
        .catch(() => {});
    });
    return () => unsubscribe();
  }, []);

  async function fetchAttendanceConfig(t = token) {
    try {
      const res = await fetch('/api/v3/admin/attendance-config', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (data.config) {
        setScheduleDeadlineTime(data.config.scheduleDeadlineTime ?? '23:00');
        setWeekSwitchTime(data.config.weekSwitchTime ?? '17:00');
      }
    } catch {}
  }

  async function saveAttRules() {
    setSavingAttRules(true);
    try {
      const res = await fetch('/api/v3/admin/attendance-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleDeadlineTime, weekSwitchTime }),
      });
      if (res.ok) showToast('Attendance rules updated');
      else showToast('Failed to update attendance rules');
    } catch { showToast('Failed to update attendance rules'); }
    setSavingAttRules(false);
  }

  async function fetchUsers(t = token) {
    setLoading(true);
    try {
      const res = await fetch('/api/v3/admin/users', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      setUsers(data.users || []);
      const taken = new Set(
        (data.users || []).filter((u) => getParkingType(u) === 'internal' && u.internalSpot).map((u) => u.internalSpot)
      );
      setTakenSpots(taken);
    } finally {
      setLoading(false);
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch('/api/v3/auth/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to send invite'); }
      else { showToast(`Invitation sent to ${inviteEmail.trim()}`); setInviteEmail(''); setInviteModalOpen(false); }
    } catch { showToast('Failed to send invite'); }
    setInviting(false);
  }

  async function saveUserEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const body = {
        isAdmin: editUser.isAdmin,
        role: editUser.parkingType,
        active: editUser.active,
      };
      if (editUser.parkingType === 'internal') body.internalSpot = editUser.internalSpot || null;
      else body.internalSpot = null;

      const res = await fetch(`/api/v3/admin/users/${editUser.uid}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to update user'); }
      else { showToast('User updated'); setEditUser(null); fetchUsers(); }
    } catch { showToast('Failed to update user'); }
    setSaving(false);
  }

  async function sendPasswordReset(uid) {
    setResettingPassword(true);
    try {
      const res = await fetch('/api/v3/admin/users/reset-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      if (res.ok) showToast('Password reset email sent');
      else { const d = await res.json(); showToast(d.error || 'Failed to send reset email'); }
    } catch { showToast('Failed to send reset email'); }
    setResettingPassword(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const filtered = users.filter((u) => {
    if (filterParking !== 'all' && getParkingType(u) !== filterParking) return false;
    if (filterAdmin === 'admin' && !isAdminUser(u)) return false;
    if (filterAdmin === 'user' && isAdminUser(u)) return false;
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout title="User Management">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage employee parking types and admin access.</p>
          </div>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
            style={{ backgroundColor: '#1183d4' }}
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Invite User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">search</span>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 mr-1">Parking:</span>
            {PARKING_FILTERS.map((r) => (
              <button
                key={r}
                onClick={() => setFilterParking(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filterParking === r ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
                style={filterParking === r ? { backgroundColor: '#1183d4' } : {}}
              >
                {r === 'all' ? 'All' : PARKING_LABELS[r]?.label || r}
              </button>
            ))}
            <span className="text-xs text-gray-300 mx-1">|</span>
            <span className="text-xs text-gray-500 mr-1">Access:</span>
            {[['all', 'All'], ['admin', 'Admins'], ['user', 'Non-admins']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setFilterAdmin(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filterAdmin === val ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
                style={filterAdmin === val ? { backgroundColor: '#7c3aed' } : {}}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20"><span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Parking Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Internal Spot</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell text-center">Admin</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Active</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No users found</td></tr>
                  )}
                  {filtered.map((u) => {
                    const pt = getParkingType(u);
                    const pStyle = PARKING_LABELS[pt] || PARKING_LABELS.none;
                    const admin = isAdminUser(u);
                    return (
                      <tr key={u.uid} className={`hover:bg-gray-50 transition-colors ${!u.active ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-4">
                          <div className="font-medium text-sm text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                            {pStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                          {pt === 'internal' ? (u.internalSpot || <span className="text-amber-600">Unassigned</span>) : '—'}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell text-center">
                          {admin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              <span className="material-symbols-outlined text-xs">shield</span>
                              Admin
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${u.active ? 'bg-green-400' : 'bg-gray-300'}`} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setEditUser({
                              uid: u.uid,
                              name: u.name,
                              email: u.email,
                              parkingType: pt,
                              isAdmin: admin,
                              internalSpot: u.internalSpot || '',
                              active: u.active ?? true,
                            })}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                          >
                            Edit
                            <span className="material-symbols-outlined text-sm">expand_more</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Attendance Rules */}
      <div className="max-w-5xl mx-auto mt-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Attendance Rules</h3>
          <p className="text-sm text-gray-500 mb-5">Configure when weekly schedules lock and when the dashboard previews the next week.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>lock_clock</span>
                Schedule Deadline (Monday)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time" value={scheduleDeadlineTime}
                  onChange={(e) => setScheduleDeadlineTime(e.target.value)}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <span className="text-xs text-gray-500">After this time on Monday, that week&apos;s schedule is locked.</span>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>skip_next</span>
                Next-Week Preview (Friday)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time" value={weekSwitchTime}
                  onChange={(e) => setWeekSwitchTime(e.target.value)}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <span className="text-xs text-gray-500">After this time on Friday, the dashboard shows next week by default.</span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              onClick={saveAttRules} disabled={savingAttRules}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors"
              style={{ backgroundColor: '#1183d4' }}
            >
              {savingAttRules ? 'Updating…' : 'Update Rules'}
            </button>
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Invite Employee</h2>
            <p className="text-sm text-gray-500 mb-4">They&apos;ll receive an email with a registration link.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@northhighland.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setInviteModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Edit User</h2>
            <p className="text-sm text-gray-500 mb-4">{editUser.name} · {editUser.email}</p>
            <div className="space-y-4">
              {/* Parking Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking Type</label>
                <select
                  value={editUser.parkingType}
                  onChange={(e) => setEditUser({ ...editUser, parkingType: e.target.value, internalSpot: '' })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                >
                  <option value="none">No Parking</option>
                  <option value="external">External Parking</option>
                  <option value="internal">Internal Parking</option>
                </select>
              </div>

              {/* Internal spot selector */}
              {editUser.parkingType === 'internal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Internal Spot</label>
                  <select
                    value={editUser.internalSpot}
                    onChange={(e) => setEditUser({ ...editUser, internalSpot: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                  >
                    <option value="">— Select spot —</option>
                    {internalSpots.map((s) => {
                      const isTaken = takenSpots.has(s) && s !== editUser.internalSpot;
                      return (
                        <option key={s} value={s} disabled={isTaken}>
                          {s}{isTaken ? ' (assigned)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Admin access toggle */}
              <div className="rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-purple-600">admin_panel_settings</span>
                    Admin Access
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Can access the admin dashboard</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={editUser.isAdmin}
                    onChange={(e) => setEditUser({ ...editUser, isAdmin: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500" />
                </label>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={editUser.active}
                    onChange={(e) => setEditUser({ ...editUser, active: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500" />
                </label>
                <span className="text-sm text-gray-700">Active account</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => sendPasswordReset(editUser.uid)}
                disabled={resettingPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-60 transition-colors"
              >
                <span className="material-symbols-outlined text-base">lock_reset</span>
                {resettingPassword ? 'Sending…' : 'Send Password Reset Email'}
              </button>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={saveUserEdit}
                disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </AdminLayout>
  );
}
