// GET /api/v3/admin/reports/stats?type=weekly|monthly&date=YYYY-MM-DD
// Returns KPI cards + chart data for the admin reports dashboard
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';
import { USERS_COLLECTION, ATTENDANCE_COLLECTION, PARKING_COLLECTION, LATE_REQUESTS_COLLECTION } from '@/lib/config/constants';

function getWeekRange(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diff);
  const fri = new Date(mon);
  fri.setUTCDate(mon.getUTCDate() + 4);
  return { start: mon.toISOString().split('T')[0], end: fri.toISOString().split('T')[0] };
}

function getMonthRange(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
  return { start, end };
}

// Splits a range into weekly buckets for the chart
function weeklyBuckets(start, end) {
  const buckets = [];
  const cur = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  let weekNum = 1;
  while (cur <= last) {
    const weekStart = cur.toISOString().split('T')[0];
    const weekEnd = new Date(cur);
    weekEnd.setUTCDate(cur.getUTCDate() + 6);
    buckets.push({
      label: `Week ${weekNum++}`,
      start: weekStart,
      end: weekEnd > last ? last.toISOString().split('T')[0] : weekEnd.toISOString().split('T')[0],
    });
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return buckets;
}

// Daily attendance counts Mon-Fri for a range
function dayOfWeekCounts(attendanceDocs) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
  attendanceDocs.forEach((doc) => {
    const { date, status } = doc.data();
    if (status !== 'office') return;
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay(); // 1=Mon 5=Fri
    if (dow >= 1 && dow <= 5) counts[days[dow - 1]]++;
  });
  return days.map((d) => ({ label: d, value: counts[d] }));
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const type = req.query.type || 'weekly';
  const date = req.query.date || new Date().toISOString().split('T')[0];

  const range = type === 'monthly' ? getMonthRange(date) : getWeekRange(date);

  const [usersSnap, attSnap, parkSnap, lateSnap] = await Promise.all([
    db.collection(USERS_COLLECTION).where('active', '==', true).get(),
    db.collection(ATTENDANCE_COLLECTION).where('date', '>=', range.start).where('date', '<=', range.end).get(),
    db.collection(PARKING_COLLECTION).where('date', '>=', range.start).where('date', '<=', range.end).get(),
    db.collection(LATE_REQUESTS_COLLECTION).where('date', '>=', range.start).where('date', '<=', range.end).get(),
  ]);

  const nonAdminUsers = usersSnap.docs.filter((d) => !d.data().isAdmin && d.data().role !== 'admin');
  const totalEmployees = nonAdminUsers.length;
  const officeAttendances = attSnap.docs.filter((d) => d.data().status === 'office');
  const avgDailyAttendance = totalEmployees > 0
    ? Math.round(officeAttendances.length / Math.max(type === 'weekly' ? 5 : 20, 1))
    : 0;

  // Parking utilization: reservations / (employees * workdays)
  const workdays = type === 'weekly' ? 5 : 20;
  const parkingUtilization = totalEmployees > 0
    ? Math.round((parkSnap.size / Math.max(totalEmployees * workdays, 1)) * 100)
    : 0;

  const lateRequests = lateSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lateChanges = lateRequests.length;
  const approvedLate = lateRequests.filter((r) => r.status === 'approved');
  // No-shows = approved attendance late changes (user was scheduled to come in but got approved to not come)
  const noShows = approvedLate.filter((r) => r.type === 'attendance').length;

  // Weekly attendance trends (day-of-week breakdown)
  const attendanceTrend = dayOfWeekCounts(attSnap.docs);

  // Cancellations per week bucket (for monthly view) or per day (weekly)
  let cancellationsChart = [];
  if (type === 'monthly') {
    const buckets = weeklyBuckets(range.start, range.end);
    cancellationsChart = buckets.map((b) => {
      const regular = lateRequests.filter((r) => r.date >= b.start && r.date <= b.end && r.status !== 'approved').length;
      const late = lateRequests.filter((r) => r.date >= b.start && r.date <= b.end && r.status === 'approved').length;
      return { label: b.label, regular, late };
    });
  } else {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dayNums = [1, 2, 3, 4, 5];
    cancellationsChart = days.map((d, i) => {
      const late = lateRequests.filter((r) => new Date(`${r.date}T12:00:00Z`).getUTCDay() === dayNums[i]).length;
      return { label: d, regular: 0, late };
    });
  }

  // Approved late changes log
  const lateChangesLog = approvedLate.map((r) => ({
    userName: r.userName,
    email: r.email,
    date: r.date,
    type: r.type,
    reason: r.reason,
    status: r.status,
  }));

  return res.status(200).json({
    kpis: {
      avgDailyAttendance,
      parkingUtilization,
      noShows,
      lateChanges,
    },
    attendanceTrend,
    cancellationsChart,
    lateChangesLog,
  });
}

export default withCors(withAdminAuth(handler));
