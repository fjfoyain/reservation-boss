// GET /api/v3/admin/reports/room-analytics?roomType=meeting|calling&period=week|month&date=YYYY-MM-DD
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
  return { start: mon.toISOString().split('T')[0], end: fri.toISOString().split('T')[0], workdays: 5 };
}

function getMonthRange(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
  return { start, end, workdays: 20 };
}

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { roomType = 'meeting', period = 'week', date } = req.query;
  const dateStr = date || new Date().toISOString().split('T')[0];
  const range = period === 'month' ? getMonthRange(dateStr) : getWeekRange(dateStr);

  // Fetch rooms (single-field query, filter type in JS)
  const roomsSnap = await db.collection('v3_rooms').where('active', '==', true).get();
  const rooms = roomsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.type === roomType);
  const roomIds = new Set(rooms.map((r) => r.id));

  // Fetch reservations in date range
  const resSnap = await db
    .collection('v3_room_reservations')
    .where('date', '>=', range.start)
    .where('date', '<=', range.end)
    .get();

  // Filter by roomType
  const reservations = resSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => roomIds.has(r.roomId));

  const totalBookings = reservations.length;

  // Average utilization: slots per room per day = (18-8)*2 = 20 slots (30-min blocks)
  const slotsPerRoomPerDay = 20;
  const availableSlots = rooms.length * range.workdays * slotsPerRoomPerDay;
  const avgUtilization = availableSlots > 0
    ? Math.min(100, Math.round((totalBookings / availableSlots) * 100))
    : 0;

  // Average duration in minutes
  let totalMinutes = 0;
  reservations.forEach((r) => {
    if (r.startTime && r.endTime) {
      totalMinutes += timeToMinutes(r.endTime) - timeToMinutes(r.startTime);
    }
  });
  const avgDurationMinutes = totalBookings > 0 ? Math.round(totalMinutes / totalBookings) : 0;

  // Popular rooms: count by roomName
  const roomCounts = {};
  reservations.forEach((r) => {
    roomCounts[r.roomName] = (roomCounts[r.roomName] || 0) + 1;
  });
  const popularRooms = Object.entries(roomCounts)
    .map(([roomName, bookings]) => ({ roomName, bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 8);

  // Peak times: count by start hour
  const hourCounts = {};
  for (let h = 8; h < 18; h++) hourCounts[h] = 0;
  reservations.forEach((r) => {
    if (r.startTime) {
      const hour = parseInt(r.startTime.split(':')[0], 10);
      if (hour >= 8 && hour < 18) hourCounts[hour]++;
    }
  });
  const peakTimes = Object.entries(hourCounts).map(([hour, bookings]) => {
    const h = parseInt(hour, 10);
    const label = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
    return { hour: h, label, bookings };
  });

  // Top users: count by userId
  const userCounts = {};
  reservations.forEach((r) => {
    if (!userCounts[r.userId]) {
      userCounts[r.userId] = { userName: r.userName || r.email, email: r.email, bookings: 0 };
    }
    userCounts[r.userId].bookings++;
  });
  const topUsers = Object.values(userCounts)
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10)
    .map((u) => ({ ...u, initials: initials(u.userName) }));

  return res.status(200).json({
    kpis: { totalBookings, avgUtilization, avgDurationMinutes },
    popularRooms,
    peakTimes,
    topUsers,
  });
}

export default withCors(withAdminAuth(handler));
