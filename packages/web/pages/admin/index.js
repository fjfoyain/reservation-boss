import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const STAT_CARDS = [
  { key: 'totalUsers', label: 'Total Users', icon: 'group', color: '#1183d4' },
  { key: 'officeToday', label: 'In Office Today', icon: 'apartment', color: '#00A3E0' },
  { key: 'pendingRequests', label: 'Pending Requests', icon: 'schedule', color: '#f59e0b' },
  { key: 'roomBookingsToday', label: 'Room Bookings Today', icon: 'meeting_room', color: '#10b981' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      try {
        const res = await fetch('/api/v3/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Overview of office operations.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map(({ key, label, icon, color }) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <span className="material-symbols-outlined text-xl" style={{ color }}>{icon}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {loading ? '—' : stats?.[key] ?? '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: '/admin/users', icon: 'person_add', label: 'Invite Users', desc: 'Add new employees to the portal' },
            { href: '/admin/requests', icon: 'pending_actions', label: 'Review Requests', desc: 'Approve or deny late change requests' },
            { href: '/admin/reports', icon: 'analytics', label: 'View Reports', desc: 'Attendance, parking, and room analytics' },
          ].map(({ href, icon, label, desc }) => (
            <a
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <span className="material-symbols-outlined text-3xl mb-3 block" style={{ color: '#1183d4' }}>{icon}</span>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{label}</h3>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </a>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
