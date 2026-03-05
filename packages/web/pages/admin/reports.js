import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const TABS = ['attendance', 'parking', 'rooms', 'late-requests'];
const TAB_LABELS = { attendance: 'Attendance', parking: 'Parking', rooms: 'Rooms', 'late-requests': 'Late Requests' };

function getCurrentMonday() {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export default function AdminReportsPage() {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState('attendance');
  const [reportType, setReportType] = useState('weekly');
  const [date, setDate] = useState(getCurrentMonday());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!token) return;
    loadReport();
  }, [token, tab, reportType, date]);

  async function loadReport() {
    setLoading(true);
    const endpoint =
      tab === 'late-requests'
        ? `/api/v3/admin/reports/late-requests?period=${reportType}&date=${date}`
        : `/api/v3/admin/reports/${tab}?type=${reportType}&date=${date}`;
    try {
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReportData(data);
    } catch {
      setReportData(null);
    }
    setLoading(false);
  }

  async function downloadCSV() {
    const endpoint =
      tab === 'late-requests'
        ? `/api/v3/admin/reports/late-requests?period=${reportType}&date=${date}&format=csv`
        : `/api/v3/admin/reports/${tab}?type=${reportType}&date=${date}&format=csv`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nh-${tab}-${reportType}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = reportData?.rows || [];

  return (
    <AdminLayout title="Reports">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">Attendance, parking, room usage, and late request analytics.</p>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors ${
                tab === t ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              style={tab === t ? { backgroundColor: '#1183d4' } : {}}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex gap-2">
            {['weekly', 'monthly'].map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                  reportType === type ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                style={reportType === type ? { backgroundColor: '#00A3E0' } : {}}
              >
                {type}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2"
          />
        </div>

        {/* Report table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-5xl">bar_chart</span>
              <p className="mt-3 text-sm">No data for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {reportData?.columns?.map((col) => (
                      <th key={col} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-3 text-gray-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reportData?.summary && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
              {reportData.summary}
            </div>
          )}
        </div>
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </AdminLayout>
  );
}
