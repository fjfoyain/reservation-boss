// GET /api/v3/parking/availability?date=YYYY-MM-DD — Returns taken spots for a date
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
  }

  try {
    const snapshot = await db
      .collection('v3_parking')
      .where('date', '==', date)
      .get();

    const takenSpots = snapshot.docs.map((doc) => doc.data().spot);
    return res.status(200).json({ date, takenSpots });
  } catch (err) {
    console.error('parking/availability error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(withAuthV3(handler));
