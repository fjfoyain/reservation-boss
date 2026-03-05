// GET /api/v3/admin/reports/rooms?type=weekly|monthly&date=YYYY-MM-DD&format=csv
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

  const type = req.query.type || 'weekly';
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const format = req.query.format || 'json';

  const range = type === 'monthly' ? getMonthRange(date) : getWeekRange(date);

  const snap = await db
    .collection('v3_room_reservations')
    .where('date', '>=', range.start)
    .where('date', '<=', range.end)
    .orderBy('date')
    .get();

  const bookings = snap.docs.map((doc) => doc.data());

  const columns = ['Employee Email', 'Room', 'Type', 'Date', 'Start', 'End'];
  const rows = bookings.map((b) => [
    b.email,
    b.roomName,
    b.roomType === 'calling' ? 'Calling Booth' : 'Meeting Room',
    new Date(`${b.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    b.startTime,
    b.endTime,
  ]);

  const summary = `${bookings.length} room booking${bookings.length !== 1 ? 's' : ''} in this period`;

  if (format === 'csv') {
    const csv = toCSV(columns, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rooms-${type}-${date}.csv"`);
    return res.send(csv);
  }

  return res.status(200).json({ columns, rows, summary });
}

export default withCors(withAdminAuth(handler));
