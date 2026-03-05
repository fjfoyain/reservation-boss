import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const DATA_TABS = ['attendance', 'parking', 'rooms', 'late-requests'];
const TAB_LABELS = { attendance: 'Attendance', parking: 'Parking', rooms: 'Rooms', 'late-requests': 'Late Requests' };

function getCurrentMonday() {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// Pure CSS bar chart
function BarChart({ data, color = '#1183d4', maxValue, label }) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {label && <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{label}</p>}
      <div className="flex items-end gap-2 h-24">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-gray-500 font-medium">{d.value}</span>
            <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max((d.value / max) * 72, 4)}px`, backgroundColor: color }} />
            <span className="text-[10px] text-gray-400 whitespace-nowrap">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stacked bar chart for cancellations (regular + late)
function StackedBarChart({ data, label }) {
  const maxVal = Math.max(...data.map((d) => (d.regular || 0) + (d.late || 0)), 1);
  return (
    <div>
      {label && <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{label}</p>}
      <div className="flex items-end gap-2 h-24 mb-1">
        {data.map((d, i) => {
          const total = (d.regular || 0) + (d.late || 0);
          const totalH = Math.max((total / maxVal) * 72, total > 0 ? 4 : 0);
          const lateH = total > 0 ? (d.late / total) * totalH : 0;
          const regH = totalH - lateH;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs text-gray-500 font-medium">{total || ''}</span>
              <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
                <div className="w-full rounded-t-sm" style={{ height: `${lateH}px`, backgroundColor: '#f59e0b' }} />
                <div className="w-full" style={{ height: `${regH}px`, backgroundColor: '#e5e7eb' }} />
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} /><span className="text-xs text-gray-500">Late</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-200" /><span className="text-xs text-gray-500">Other</span></div>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState('attendance');
  const [reportType, setReportType] = useState('weekly');
  const [date, setDate] = useState(getCurrentMonday());

  // Overview (KPI + charts)
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Data table
  const [reportData, setReportData] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);

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
    loadStats();
    loadReport();
  }, [token, reportType, date]);

  useEffect(() => {
    if (!token) return;
    loadReport();
  }, [tab]);

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/v3/admin/reports/stats?type=${reportType}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    }
    setStatsLoading(false);
  }

  async function loadReport() {
    setTableLoading(true);
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
    setTableLoading(false);
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
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">Attendance, parking, room usage, and late request analytics.</p>
          </div>
          {/* Period controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {['weekly', 'monthly'].map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    reportType === type ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  style={reportType === type ? { backgroundColor: '#1183d4' } : {}}
                >
                  {type}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* KPI Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : stats?.kpis ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#eaf4fd' }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: '#1183d4' }}>groups</span>
                </div>
                <p className="text-sm text-gray-500">Avg Daily In-Office</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.kpis.avgDailyAttendance}</p>
              <p className="text-xs text-gray-400 mt-1">employees / day</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e6f9f1' }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: '#059669' }}>local_parking</span>
                </div>
                <p className="text-sm text-gray-500">Parking Utilization</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.kpis.parkingUtilization}%</p>
              <p className="text-xs text-gray-400 mt-1">external spots used</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: '#d97706' }}>schedule</span>
                </div>
                <p className="text-sm text-gray-500">Late Requests</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.kpis.lateChanges}</p>
              <p className="text-xs text-gray-400 mt-1">submitted this period</p>
            </div>
          </div>
        ) : null}

        {/* Charts Row */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <BarChart
                data={stats.attendanceTrend}
                color="#1183d4"
                label="Weekly Attendance Trend (In-Office)"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <StackedBarChart
                data={stats.cancellationsChart}
                label="Late Requests by Period"
              />
            </div>
          </div>
        )}

        {/* Late Changes Log */}
        {stats?.lateChangesLog?.length > 0 && !statsLoading && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Approved Late Changes Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Employee', 'Date', 'Type', 'Reason', 'Status'].map((col) => (
                      <th key={col} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.lateChangesLog.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.userName}</div>
                        <div className="text-xs text-gray-400">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          r.type === 'parking' ? 'bg-blue-50 text-blue-700'
                          : r.type === 'room' ? 'bg-purple-50 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{r.type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.reason}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Approved</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Tabs */}
        <div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {DATA_TABS.map((t) => (
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
            <button
              onClick={downloadCSV}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {tableLoading ? (
              <div className="flex justify-center py-16">
                <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
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
                          <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>
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
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </AdminLayout>
  );
}
