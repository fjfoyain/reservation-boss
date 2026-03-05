// GET /api/v3/parking/week?start=YYYY-MM-DD — Get user's parking reservations for a week
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { start } = req.query;
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return res.status(400).json({ error: 'start date (YYYY-MM-DD) is required' });
  }

  const endDate = new Date(`${start}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 4);
  const end = endDate.toISOString().split('T')[0];

  const snapshot = await db
    .collection('v3_parking')
    .where('userId', '==', req.user.uid)
    .where('date', '>=', start)
    .where('date', '<=', end)
    .get();

  const parking = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return res.status(200).json({ parking });
}

export default withCors(withAuthV3(handler));
