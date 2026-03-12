import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const TYPE_CONFIG = {
  parking: { label: 'Parking', bg: 'bg-blue-50', text: 'text-blue-700' },
  attendance: { label: 'Attendance', bg: 'bg-gray-100', text: 'text-gray-700' },
  room: { label: 'Room Booking', bg: 'bg-purple-50', text: 'text-purple-700' },
};

export default function AdminRequestsPage() {
  const [token, setToken] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      fetchRequests(idToken, statusFilter);
    });
    return () => unsubscribe();
  }, []);

  async function fetchRequests(t = token, status = statusFilter) {
    setLoading(true);
    try {
      const res = await fetch(`/api/v3/admin/late-requests?status=${status}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action) {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/v3/admin/late-requests/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || `Failed to ${action} request`); }
      else {
        showToast(`Request ${action === 'approve' ? 'approved' : 'denied'}`);
        fetchRequests();
      }
    } catch { showToast(`Failed to ${action} request`); }
    setProcessingId('');
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  return (
    <AdminLayout title="Pending Requests" allowPeopleLead>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Late Change Requests</h2>
            <p className="text-sm text-gray-500 mt-1">Review and manage late cancellation requests from employees.</p>
          </div>
          <div className="flex gap-2">
            {['pending', 'approved', 'denied'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); fetchRequests(token, s); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${
                  statusFilter === s ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                style={statusFilter === s ? { backgroundColor: '#1183d4' } : {}}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20"><div className="css-spinner"></div></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-5xl">inbox</span>
              <p className="mt-3 text-sm">No {statusFilter} requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase w-1/5">Employee</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase w-1/6">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase w-1/8">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                    {statusFilter === 'pending' && (
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => {
                    const dateLabel = new Date(`${req.date}T12:00:00Z`).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
                    });
                    const isProcessing = processingId === req.id;
                    return (
                      <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
                              {req.userName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{req.userName}</div>
                              <div className="text-xs text-gray-500">{req.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{dateLabel}</td>
                        <td className="px-6 py-4">
                          {(() => {
                            const tc = TYPE_CONFIG[req.type] || { label: req.type, bg: 'bg-gray-100', text: 'text-gray-700' };
                            return (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tc.bg} ${tc.text}`}>
                                {tc.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{req.reason}</td>
                        {statusFilter === 'pending' && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAction(req.id, 'approve')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                aria-label={`Approve request from ${req.userName || req.email}`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(req.id, 'deny')}
                                disabled={isProcessing}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                aria-label={`Deny request from ${req.userName || req.email}`}
                              >
                                Deny
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </AdminLayout>
  );
}
