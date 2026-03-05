// GET /api/v3/admin/reports/late-requests?period=weekly|monthly&date=YYYY-MM-DD&format=csv
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';

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

function toCSV(columns, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  return lines.join('\n');
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const period = req.query.period || 'monthly';
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const format = req.query.format || 'json';

  const range = period === 'weekly' ? getWeekRange(date) : getMonthRange(date);

  const snap = await db
    .collection('v3_late_requests')
    .where('date', '>=', range.start)
    .where('date', '<=', range.end)
    .orderBy('date', 'desc')
    .get();

  const requests = snap.docs.map((doc) => doc.data());

  const TYPE_LABELS = { attendance: 'Attendance', parking: 'Parking', room: 'Room' };
  const columns = ['Employee', 'Email', 'Date', 'Type', 'Status', 'Reason'];
  const rows = requests.map((r) => [
    r.userName,
    r.email,
    new Date(`${r.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    TYPE_LABELS[r.type] || r.type,
    r.status.charAt(0).toUpperCase() + r.status.slice(1),
    r.reason,
  ]);

  const approved = requests.filter((r) => r.status === 'approved').length;
  const denied = requests.filter((r) => r.status === 'denied').length;
  const pending = requests.filter((r) => r.status === 'pending').length;
  const summary = `${requests.length} requests — ${approved} approved, ${denied} denied, ${pending} pending`;

  if (format === 'csv') {
    const csv = toCSV(columns, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="late-requests-${period}-${date}.csv"`);
    return res.send(csv);
  }

  return res.status(200).json({ columns, rows, summary });
}

export default withCors(withAdminAuth(handler));
