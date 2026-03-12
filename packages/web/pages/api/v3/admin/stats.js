// GET /api/v3/admin/stats — Dashboard stat counts
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';
import { USERS_COLLECTION, LATE_REQUESTS_COLLECTION, ROOM_RESERVATIONS_COLLECTION, ATTENDANCE_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  // Run all queries in parallel
  const [usersSnap, pendingSnap, roomsSnap, attendanceSnap] = await Promise.all([
    db.collection(USERS_COLLECTION).where('active', '==', true).get(),
    db.collection(LATE_REQUESTS_COLLECTION).where('status', '==', 'pending').get(),
    db.collection(ROOM_RESERVATIONS_COLLECTION).where('date', '==', today).get(),
    db.collection(ATTENDANCE_COLLECTION).where('date', '==', today).get(),
  ]);

  const officeToday = attendanceSnap.docs.filter((d) => d.data().status === 'office').length;

  return res.status(200).json({
    totalUsers: usersSnap.size,
    pendingRequests: pendingSnap.size,
    roomBookingsToday: roomsSnap.size,
    officeToday,
  });
}

export default withCors(withAdminAuth(handler));
