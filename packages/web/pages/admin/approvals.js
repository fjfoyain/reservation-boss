import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

const API_URL = '/api';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

export default function ApprovalsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null); // approval id
  const [rejectNotes, setRejectNotes] = useState('');
  const [actioning, setActioning] = useState(null); // approval id being actioned

  const fetchApprovals = useCallback(async (idToken, status) => {
    try {
      const { data } = await axios.get(`${API_URL}/approvals?status=${status}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setApprovals(data);
    } catch {
      toast.error('Failed to load approvals');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        setCurrentUser(user);
        setToken(idToken);
        await fetchApprovals(idToken, 'pending');
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, fetchApprovals]);

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    await fetchApprovals(token, tab);
  };

  const handleApprove = async (id) => {
    setActioning(id);
    try {
      await axios.patch(`${API_URL}/approvals/${id}`, { action: 'approve' }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Reservation approved and confirmed!');
      await fetchApprovals(token, activeTab);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setActioning(null);
    }
  };

  const openRejectModal = (id) => {
    setRejectModal(id);
    setRejectNotes('');
  };

  const handleReject = async () => {
    setActioning(rejectModal);
    try {
      await axios.patch(
        `${API_URL}/approvals/${rejectModal}`,
        { action: 'reject', notes: rejectNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Request rejected');
      setRejectModal(null);
      setRejectNotes('');
      await fetchApprovals(token, activeTab);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setActioning(null);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(`${dateStr}T12:00:00Z`);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const tabCount = (tab) => (activeTab === tab ? approvals.length : null);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-nh-navy shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Pending Approvals</h1>
                <p className="text-sm text-nh-teal mt-1 font-semibold">People Lead Dashboard</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white font-medium">{currentUser?.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-semibold text-white hover:bg-nh-dark-navy rounded-md transition-colors border border-white/40"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md">
            {/* Tabs */}
            <div className="border-b border-gray-200 px-6">
              <nav className="flex space-x-6">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`py-4 text-sm font-semibold border-b-2 capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && approvals.length > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {approvals.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {approvals.length === 0 ? (
                <p className="text-gray-500 italic py-4">
                  No {activeTab} requests.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parking Spot</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                        {activeTab !== 'pending' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        )}
                        {activeTab === 'pending' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {approvals.map((approval) => (
                        <tr key={approval.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {approval.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {approval.spot}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatDate(approval.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTimestamp(approval.createdAt)}
                          </td>
                          {activeTab !== 'pending' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {approval.status === 'approved' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  Approved
                                </span>
                              ) : (
                                <div>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                    Rejected
                                  </span>
                                  {approval.notes && (
                                    <p className="text-xs text-gray-400 mt-1">{approval.notes}</p>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                          {activeTab === 'pending' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => handleApprove(approval.id)}
                                  disabled={actioning === approval.id}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:bg-gray-300"
                                >
                                  {actioning === approval.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => openRejectModal(approval.id)}
                                  disabled={actioning === approval.id}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:bg-gray-300"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Optionally provide a reason. The employee will be notified by email.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actioning}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:bg-gray-400"
              >
                {actioning ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
