import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const EXTERNAL_SPOTS = [
  'Parking 1', 'Parking 2', 'Parking 3', 'Parking 4', 'Parking 5',
];
const INTERNAL_SPOTS = [
  'Parking 6', 'Parking 7', 'Parking 8', 'Parking 9', 'Parking 10',
];

export default function AdminParkingPage() {
  const [token, setToken] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      fetchUsers(idToken);
    });
    return () => unsubscribe();
  }, []);

  async function fetchUsers(t = token) {
    setLoading(true);
    try {
      const res = await fetch('/api/v3/admin/users', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  }

  // Build internal spot → assigned user map
  const spotAssignments = {};
  users
    .filter((u) => u.role === 'internal' && u.internalSpot)
    .forEach((u) => { spotAssignments[u.internalSpot] = u; });

  const externalUsers = users.filter((u) => u.role === 'external' && u.active);
  const internalUsers = users.filter((u) => u.role === 'internal' && u.active);

  return (
    <AdminLayout title="Parking Config">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Parking Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">View spot assignments and active parking users.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span>
          </div>
        ) : (
          <>
            {/* Internal Spots */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ color: '#1183d4' }}>garage</span>
                <h3 className="font-semibold text-gray-900">Internal Spots (Permanently Assigned)</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {INTERNAL_SPOTS.map((spot) => {
                  const assignedUser = spotAssignments[spot];
                  return (
                    <div key={spot} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">local_parking</span>
                        <span className="text-sm font-medium text-gray-900">{spot}</span>
                      </div>
                      {assignedUser ? (
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{assignedUser.name}</div>
                          <div className="text-xs text-gray-500">{assignedUser.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-amber-600 font-medium">Unassigned</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                {internalUsers.length} active internal users · Manage assignments in{' '}
                <a href="/admin/users" className="text-blue-600 hover:underline">User Management</a>
              </div>
            </div>

            {/* External Spots */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ color: '#00A3E0' }}>directions_car</span>
                <h3 className="font-semibold text-gray-900">External Spots (Daily Reservations)</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {EXTERNAL_SPOTS.map((spot) => (
                  <div key={spot} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-gray-400">local_parking</span>
                      <span className="text-sm font-medium text-gray-900">{spot}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Available daily
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                {externalUsers.length} active external users · Max 4 reservations/week per user
              </div>
            </div>

            {/* External Users */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">External Parking Users</h3>
              </div>
              {externalUsers.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No external parking users</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {externalUsers.map((u) => (
                    <div key={u.uid} className="flex items-center gap-3 px-5 py-3">
                      <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-medium text-xs">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </AdminLayout>
  );
}
