// GET /api/v3/admin/reports/attendance?type=weekly|monthly&date=YYYY-MM-DD&format=csv
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';
import { USERS_COLLECTION, ATTENDANCE_COLLECTION } from '@/lib/config/constants';

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

function datesBetween(start, end) {
  const dates = [];
  const cur = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cur <= last) {
    const dow = cur.getUTCDay();
    if (dow >= 1 && dow <= 5) dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function toCSV(columns, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  return lines.join('\n');
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const type = req.query.type || 'weekly';
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const format = req.query.format || 'json';

  const range = type === 'monthly' ? getMonthRange(date) : getWeekRange(date);
  const workdays = datesBetween(range.start, range.end);

  const [usersSnap, attendanceSnap] = await Promise.all([
    db.collection(USERS_COLLECTION).where('active', '==', true).get(),
    db.collection(ATTENDANCE_COLLECTION).where('date', '>=', range.start).where('date', '<=', range.end).get(),
  ]);

  // Build lookup: userId → date → status
  const byUser = {};
  attendanceSnap.docs.forEach((doc) => {
    const { userId, date: d, status } = doc.data();
    if (!byUser[userId]) byUser[userId] = {};
    byUser[userId][d] = status;
  });

  const dateLabels = workdays.map((d) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  );

  const MIN_OFFICE_DAYS = 3;
  const columns = ['Employee', 'Email', ...dateLabels, 'Days In Office', 'No-Show Days'];
  const rows = usersSnap.docs
    .filter((doc) => !doc.data().isAdmin && doc.data().role !== 'admin')
    .map((doc) => {
      const u = doc.data();
      const dayCells = workdays.map((d) => {
        const s = byUser[doc.id]?.[d];
        return s === 'office' ? 'Office' : s === 'remote' ? 'Remote' : '—';
      });
      const inOffice = dayCells.filter((c) => c === 'Office').length;
      const noShow = Math.max(0, MIN_OFFICE_DAYS - inOffice);
      return [u.name || u.email, u.email, ...dayCells, inOffice, noShow];
    });

  const total = rows.reduce((sum, r) => sum + Number(r[r.length - 2]), 0);
  const totalNoShow = rows.reduce((sum, r) => sum + Number(r[r.length - 1]), 0);
  const summary = `Total office attendances: ${total} across ${rows.length} employees. Total no-show days: ${totalNoShow}`;

  if (format === 'csv') {
    const csv = toCSV(columns, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${type}-${date}.csv"`);
    return res.send(csv);
  }

  return res.status(200).json({ columns, rows, summary });
}

export default withCors(withAdminAuth(handler));
