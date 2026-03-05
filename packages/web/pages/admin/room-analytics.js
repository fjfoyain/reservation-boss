import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';

const AVATAR_COLORS = [
  { bg: '#eaf4fd', text: '#1183d4' },
  { bg: '#e6f9f1', text: '#059669' },
  { bg: '#fef3c7', text: '#d97706' },
  { bg: '#f3e8ff', text: '#7c3aed' },
  { bg: '#fee2e2', text: '#dc2626' },
];

function BarChart({ data, color = '#1183d4', height = 160 }) {
  const max = Math.max(...data.map((d) => d.bookings), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 group relative">
          {/* Tooltip */}
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {d.roomName || d.label}: {d.bookings}
          </div>
          <div
            className="w-full rounded-t-sm transition-all hover:opacity-80 cursor-default"
            style={{ height: `${Math.max((d.bookings / max) * (height - 28), d.bookings > 0 ? 4 : 0)}px`, backgroundColor: color }}
          />
          <span className="text-[10px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center" title={d.roomName || d.label}>
            {(d.roomName || d.label)?.split(' ').slice(0, 2).join(' ')}
          </span>
        </div>
      ))}
    </div>
  );
}

function PeakTimesChart({ data, height = 160 }) {
  const max = Math.max(...data.map((d) => d.bookings), 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.bookings / max) * 80;
    return `${x},${y}`;
  });
  const areaPath = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(' ')} L100,100 L0,100 Z`;
  const linePath = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(' ')}`;
  return (
    <div>
      <div className="relative" style={{ height: height - 24 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path d={areaPath} fill="rgba(17,131,212,0.15)" />
          <path d={linePath} fill="none" stroke="#1183d4" strokeWidth="2" />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.bookings / max) * 80;
            return d.bookings > 0 ? (
              <circle key={i} cx={x} cy={y} r="2" fill="#1183d4" />
            ) : null;
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2 mt-1">
        {data.filter((_, i) => i % 2 === 0).map((d) => <span key={d.hour}>{d.label}</span>)}
      </div>
    </div>
  );
}

export default function RoomAnalyticsPage() {
  const [token, setToken] = useState('');
  const [roomType, setRoomType] = useState('meeting');
  const [period, setPeriod] = useState('week');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      setToken(await firebaseUser.getIdToken());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, roomType, period, date]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v3/admin/reports/room-analytics?roomType=${roomType}&period=${period}&date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(await res.json());
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  const kpis = data?.kpis;
  const popularRooms = data?.popularRooms || [];
  const peakTimes = data?.peakTimes || [];
  const topUsers = data?.topUsers || [];

  return (
    <AdminLayout title="Room Analytics">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Room Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">Usage statistics for meeting rooms and calling booths.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            {[
              { key: 'meeting', label: 'Meeting Rooms', icon: 'meeting_room' },
              { key: 'calling', label: 'Calling Booths', icon: 'call' },
            ].map((rt) => (
              <button
                key={rt.key}
                onClick={() => setRoomType(rt.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  roomType === rt.key ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={roomType === rt.key ? { backgroundColor: '#1183d4' } : {}}
              >
                <span className="material-symbols-outlined text-[18px]">{rt.icon}</span>
                {rt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {['week', 'month'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    period === p ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  style={period === p ? { backgroundColor: '#1183d4' } : {}}
                >
                  {p === 'week' ? 'This Week' : 'This Month'}
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

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">progress_activity</span>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm text-gray-500">Total Bookings</p>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eaf4fd' }}>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: '#1183d4' }}>event_available</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{kpis?.totalBookings ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-1">reservations this period</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm text-gray-500">Avg Utilization</p>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e6f9f1' }}>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: '#059669' }}>pie_chart</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{kpis?.avgUtilization ?? '—'}%</p>
                <p className="text-xs text-gray-400 mt-1">of available slots booked</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm text-gray-500">Avg Duration</p>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: '#d97706' }}>timer</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {kpis?.avgDurationMinutes ? `${kpis.avgDurationMinutes}m` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">per booking</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-5">Most Popular Rooms</h3>
                {popularRooms.length > 0 ? (
                  <BarChart data={popularRooms} color="#1183d4" height={180} />
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm">No bookings this period</div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-5">Peak Booking Times</h3>
                {peakTimes.some((p) => p.bookings > 0) ? (
                  <PeakTimesChart data={peakTimes} height={180} />
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm">No bookings this period</div>
                )}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Top Users</h3>
              </div>
              {topUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No bookings this period</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {topUsers.map((u, i) => {
                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    return (
                      <li key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {u.initials || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{u.userName}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{u.bookings}</p>
                          <p className="text-xs text-gray-400">bookings</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
