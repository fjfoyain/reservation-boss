// GET /api/v3/my-bookings — Aggregated upcoming + recent bookings for current user
// Returns attendance, parking, and room reservations merged into one list
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { uid } = req.user;
  const { role, internalSpot } = req.userProfile;

  // Fetch last 30 days + next 60 days of data
  const now = new Date();
  const past = new Date(now);
  past.setDate(past.getDate() - 30);
  const future = new Date(now);
  future.setDate(future.getDate() + 60);
  const pastStr = past.toISOString().split('T')[0];
  const futureStr = future.toISOString().split('T')[0];

  const [attSnap, parkSnap, roomSnap, lateSnap] = await Promise.all([
    db.collection('v3_attendance')
      .where('userId', '==', uid)
      .where('date', '>=', pastStr)
      .where('date', '<=', futureStr)
      .orderBy('date', 'desc')
      .get(),
    db.collection('v3_parking')
      .where('userId', '==', uid)
      .where('date', '>=', pastStr)
      .where('date', '<=', futureStr)
      .orderBy('date', 'desc')
      .get(),
    db.collection('v3_room_reservations')
      .where('userId', '==', uid)
      .where('date', '>=', pastStr)
      .where('date', '<=', futureStr)
      .orderBy('date', 'desc')
      .get(),
    // Fetch pending late requests to mark bookings as "awaiting approval"
    db.collection('v3_late_requests')
      .where('userId', '==', uid)
      .where('status', '==', 'pending')
      .get(),
  ]);

  // Build lookup of pending late requests by reservationId
  const pendingByReservation = {};
  lateSnap.docs.forEach((doc) => {
    const d = doc.data();
    pendingByReservation[d.reservationId] = doc.id;
  });

  const bookings = [];

  attSnap.docs.forEach((doc) => {
    const d = doc.data();
    bookings.push({
      id: doc.id,
      type: 'attendance',
      date: d.date,
      status: d.status, // 'office' | 'remote'
      detail: d.status === 'office' ? 'Office' : 'Remote',
      lateRequestId: pendingByReservation[doc.id] || null,
    });
  });

  parkSnap.docs.forEach((doc) => {
    const d = doc.data();
    bookings.push({
      id: doc.id,
      type: 'parking',
      date: d.date,
      detail: d.spot,
      fixed: role === 'internal' || role === 'admin', // internal/admin spots are permanent
      internalSpot: role === 'internal' || role === 'admin' ? (internalSpot || null) : null,
      lateRequestId: pendingByReservation[doc.id] || null,
    });
  });

  roomSnap.docs.forEach((doc) => {
    const d = doc.data();
    bookings.push({
      id: doc.id,
      type: 'room',
      date: d.date,
      detail: `${d.roomName} · ${d.startTime}–${d.endTime}`,
      roomName: d.roomName,
      startTime: d.startTime,
      endTime: d.endTime,
      lateRequestId: pendingByReservation[doc.id] || null,
    });
  });

  // Sort by date desc, then type
  bookings.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    const order = { attendance: 0, parking: 1, room: 2 };
    return (order[a.type] || 3) - (order[b.type] || 3);
  });

  return res.status(200).json({ bookings });
}

export default withCors(withAuthV3(handler));
