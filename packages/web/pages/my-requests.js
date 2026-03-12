import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AppHeader from '@/components/AppHeader';

const STATUS_STYLES = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Pending Review' },
  approved: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', label: 'Approved' },
  denied: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', label: 'Denied' },
};

const TYPE_LABELS = { parking: 'Parking', attendance: 'Attendance', room: 'Room Booking' };

export default function MyRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.replace('/auth/login'); return; }
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      const res = await fetch('/api/v3/profile', { headers: { Authorization: `Bearer ${idToken}` } });
      if (!res.ok) { router.replace('/auth/login'); return; }
      const profile = await res.json();
      setUser(profile);

      // Fetch requests
      const reqRes = await fetch('/api/v3/late-requests', { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await reqRes.json();
      setRequests(data.requests || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

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
        activePage="my-requests"
        onSignOut={() => signOut(auth).then(() => router.push('/auth/login'))}
      />

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Late Requests</h1>
          <p className="mt-2 text-sm text-gray-500">
            Requests submitted after the normal deadline for admin review.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="css-spinner"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <span className="material-symbols-outlined text-5xl text-gray-300">inbox</span>
            <p className="mt-4 text-gray-500">No late requests yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Late requests are created when you try to cancel a reservation after the deadline.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requests.map((req) => {
                      const style = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
                      const dateLabel = new Date(`${req.date}T12:00:00Z`).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
                      });
                      const submittedLabel = req.createdAt?.toDate
                        ? req.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                        : '—';
                      return (
                        <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{dateLabel}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{TYPE_LABELS[req.type] || req.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{req.reason}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">{submittedLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden space-y-3">
              {requests.map((req) => {
                const style = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
                const dateLabel = new Date(`${req.date}T12:00:00Z`).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
                });
                const submittedLabel = req.createdAt?.toDate
                  ? req.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                  : '—';
                return (
                  <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{dateLabel}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-sm text-gray-600">{TYPE_LABELS[req.type] || req.type}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{req.reason}</p>
                    <p className="text-xs text-gray-400">Submitted: {submittedLabel}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer style={{ backgroundColor: '#112A46' }} className="text-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">domain</span>
            <span className="font-bold tracking-tight">NORTH HIGHLAND</span>
          </div>
          <div className="text-sm text-gray-300">© {new Date().getFullYear()} North Highland. Internal use only.</div>
        </div>
      </footer>
    </div>
  );
}
