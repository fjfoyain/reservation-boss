import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import PLNav from '../../components/PLNav';

const API_URL = '/api';

export default function PLDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        setCurrentUser(user);
        setToken(idToken);
        fetchStats(idToken);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchStats = async (idToken) => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        axios.get(`${API_URL}/approvals?status=pending`, { headers: { Authorization: `Bearer ${idToken}` } }),
        axios.get(`${API_URL}/approvals?status=approved`, { headers: { Authorization: `Bearer ${idToken}` } }),
        axios.get(`${API_URL}/approvals?status=rejected`, { headers: { Authorization: `Bearer ${idToken}` } }),
      ]);
      setStats({
        pending: pending.data.length,
        approved: approved.data.length,
        rejected: rejected.data.length,
      });
    } catch {
      toast.error('Failed to load dashboard stats');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-nh-navy shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">People Lead Portal</h1>
                <p className="text-sm text-nh-teal mt-1 font-semibold">Reservation Boss</p>
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

        {/* Sub-navigation */}
        <PLNav token={token} />

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Welcome banner */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {currentUser?.email?.split('@')[0]}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Here&apos;s a summary of your team&apos;s parking approval requests.
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {/* Pending */}
            <button
              onClick={() => router.push('/admin/approvals')}
              className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                {stats.pending > 0 && (
                  <span className="inline-flex items-center justify-center h-6 w-6 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {stats.pending}
                  </span>
                )}
              </div>
              <p className="text-4xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-blue-600 mt-3 font-medium group-hover:underline">
                Review pending &rarr;
              </p>
            </button>

            {/* Approved */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Approved</p>
              <p className="text-4xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-xs text-gray-400 mt-3">Total approved requests</p>
            </div>

            {/* Rejected */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Rejected</p>
              <p className="text-4xl font-bold text-red-500">{stats.rejected}</p>
              <p className="text-xs text-gray-400 mt-3">Total rejected requests</p>
            </div>
          </div>

          {/* CTA if there are pending items */}
          {stats.pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="font-semibold text-amber-800">
                    You have {stats.pending} pending {stats.pending === 1 ? 'request' : 'requests'} waiting for your review.
                  </p>
                  <p className="text-sm text-amber-600">Your team members are waiting for approval.</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/approvals')}
                className="ml-4 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow transition-colors whitespace-nowrap"
              >
                Review Now
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
