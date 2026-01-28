// GET /api/summary/week - Get compact weekly summary for grid view
import { withCors } from '@/lib/middleware/cors';
import { db } from '@/lib/config/firebaseAdmin';
import { PARKING_SPOTS } from '@/lib/config/constants';
import { getVisibleWeekRange } from '@/lib/utils/weekHelpers';
import { getCached, setCached } from '@/lib/utils/cache';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { start, end, dates } = (() => {
    const range = getVisibleWeekRange();
    return {
      start: req.query.start || range.start,
      end: req.query.end || range.end,
      dates: range.dates,
    };
  })();

  const cacheKey = `summary:${start}:${end}`;
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

    // Initialize all spots as available (null)
    const summary = {};
    for (const d of dates) {
      summary[d] = {};
      for (const s of PARKING_SPOTS) {
        summary[d][s] = null;
      }
    }

    // Fill reserved spots
    snapshot.forEach((doc) => {
      const { date, spot, email } = doc.data();
      if (summary[date]) {
        summary[date][spot] = email || true;
      }
    });

    setCached(cacheKey, summary);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error building weekly summary:', error);
    res.status(500).json({ error: 'Failed to fetch weekly summary' });
  }
}

export default withCors(handler);
