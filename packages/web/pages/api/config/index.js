// GET /api/config - Get app configuration
import { withCors } from '@/lib/middleware/cors';
import { PARKING_SPOTS } from '@/lib/config/constants';
import { getVisibleDates } from '@/lib/utils/weekHelpers';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json({
      parkingSpots: PARKING_SPOTS,
      visibleWeekDates: getVisibleDates(),
    });
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
}

export default withCors(handler);
