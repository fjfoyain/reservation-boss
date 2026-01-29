import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

const API_URL = '/api';

export default function Reports() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const idToken = await currentUser.getIdToken();
        setToken(idToken);
        fetchWeeklyReport(idToken);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchWeeklyReport = async (idToken) => {
    try {
      const response = await axios.get(`${API_URL}/reports/weekly`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setWeeklyReport(response.data);
    } catch (error) {
      toast.error('Failed to fetch weekly report');
      console.error(error);
    }
  };

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(
        `${API_URL}/reports/monthly-csv?year=${selectedYear}&month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
      link.setAttribute('download', `parking-report-${monthName}-${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('CSV downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download CSV');
      console.error(error);
    }
    setDownloading(false);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-nh-navy shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/parking')}
                  className="text-nh-teal hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white">Parking Reports</h1>
                  <p className="text-sm text-nh-teal mt-1 font-semibold">Admin Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white font-medium">{user?.email}</span>
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
          {/* Weekly Report Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Week Report</h2>
            {weeklyReport && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Week: {weeklyReport.weekStart} to {weeklyReport.weekEnd}
                </p>
                
                {weeklyReport.report.length === 0 ? (
                  <p className="text-gray-500 italic">No reservations this week</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Days
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {weeklyReport.report.map((user, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                {user.daysCount} {user.daysCount === 1 ? 'day' : 'days'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {user.reservations.map((res, i) => (
                                <div key={i}>
                                  {res.date}: {res.spot}
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Monthly CSV Download Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Download Monthly Report</h2>
            <p className="text-sm text-gray-600 mb-6">
              Download a CSV file showing the number of days each user attended per week for the selected month.
            </p>
            
            <div className="flex items-end space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {months.map((month, idx) => (
                    <option key={idx} value={idx + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleDownloadCSV}
                disabled={downloading}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {downloading ? 'Downloading...' : 'Download CSV'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
