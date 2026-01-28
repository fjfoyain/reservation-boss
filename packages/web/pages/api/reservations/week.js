// GET /api/reservations/week - Get reservations for a specific week
import { withCors } from '../../../lib/middleware/cors';
import { db } from '../../../lib/config/firebaseAdmin';
import { getVisibleWeekRange } from '../../../lib/utils/weekHelpers';
import { getCached, setCached } from '../../../lib/utils/cache';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { start, end } = (() => {
    const range = getVisibleWeekRange();
    return {
      start: req.query.start || range.start,
      end: req.query.end || range.end,
    };
  })();

  const cacheKey = `week:${start}:${end}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const snapshot = await db
      .collection('reservations')
      .where('date', '>=', start)
      .where('date', '<=', end)
      .orderBy('date', 'asc')
      .get();

    const reservations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setCached(cacheKey, reservations);
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Error fetching weekly reservations:', error);
    res.status(500).json({ error: 'Failed to fetch weekly reservations' });
  }
}

export default withCors(handler);
