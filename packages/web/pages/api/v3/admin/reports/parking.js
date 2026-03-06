// GET /api/v3/admin/reports/parking?type=weekly|monthly&date=YYYY-MM-DD&format=csv
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

function fmtDate(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
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

  // Fetch external parking reservations and internal users + attendance in parallel
  const [externalSnap, internalUsersSnap, attendanceSnap] = await Promise.all([
    db.collection('v3_parking')
      .where('date', '>=', range.start)
      .where('date', '<=', range.end)
      .orderBy('date')
      .get(),
    db.collection('v3_users').where('role', '==', 'internal').get(),
    db.collection('v3_attendance')
      .where('date', '>=', range.start)
      .where('date', '<=', range.end)
      .get(),
  ]);

  // --- External parking ---
  const externalReservations = externalSnap.docs.map((doc) => doc.data());
  const externalColumns = ['Employee Email', 'Date', 'Spot'];
  const externalRows = externalReservations.map((r) => [r.email, fmtDate(r.date), r.spot]);

  // --- Internal parking (derived from attendance) ---
  // Build a map of internal users: userId → { name, email, internalSpot }
  const internalUsers = {};
  internalUsersSnap.docs.forEach((doc) => {
    const u = doc.data();
    internalUsers[doc.id] = { name: u.name || u.email, email: u.email, spot: u.internalSpot || '—' };
  });

  // Filter attendance: status === 'office' AND user is internal
  const internalColumns = ['Employee', 'Email', 'Assigned Spot', 'Date'];
  const internalRows = [];
  attendanceSnap.docs.forEach((doc) => {
    const a = doc.data();
    if (a.status === 'office' && internalUsers[a.userId]) {
      const u = internalUsers[a.userId];
      internalRows.push([u.name, u.email, u.spot, fmtDate(a.date)]);
    }
  });
  // Sort by date then name
  internalRows.sort((a, b) => a[3].localeCompare(b[3]) || a[0].localeCompare(b[0]));

  if (format === 'csv') {
    const extCSV = toCSV(externalColumns, externalRows);
    const intCSV = toCSV(internalColumns, internalRows);
    const csv = `EXTERNAL PARKING\n${extCSV}\n\nINTERNAL PARKING\n${intCSV}`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="parking-${type}-${date}.csv"`);
    return res.send(csv);
  }

  return res.status(200).json({
    sections: [
      {
        title: 'External Parking',
        icon: 'drive_eta',
        color: '#059669',
        columns: externalColumns,
        rows: externalRows,
        summary: `${externalRows.length} external reservation${externalRows.length !== 1 ? 's' : ''}`,
      },
      {
        title: 'Internal Parking',
        icon: 'directions_car',
        color: '#1183d4',
        columns: internalColumns,
        rows: internalRows,
        summary: `${internalRows.length} internal parking day${internalRows.length !== 1 ? 's' : ''} (auto-tracked from attendance)`,
      },
    ],
  });
}

export default withCors(withAdminAuth(handler));
