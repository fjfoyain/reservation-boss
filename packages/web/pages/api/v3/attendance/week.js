// GET /api/v3/attendance/week?start=YYYY-MM-DD — Get user's attendance for a week
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { ATTENDANCE_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { start } = req.query;
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return res.status(400).json({ error: 'start date (YYYY-MM-DD) is required' });
  }

  // Get Mon–Fri end date (start + 4 days)
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 4);
  const end = endDate.toISOString().split('T')[0];

  try {
    const snapshot = await db
      .collection(ATTENDANCE_COLLECTION)
      .where('userId', '==', req.user.uid)
      .get();

    const attendance = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((a) => a.date >= start && a.date <= end);

    return res.status(200).json({ attendance });
  } catch (err) {
    console.error('attendance/week error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(withAuthV3(handler));
