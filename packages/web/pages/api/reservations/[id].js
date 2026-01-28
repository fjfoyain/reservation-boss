// DELETE /api/reservations/[id] - Release a specific reservation (admin only)
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { getVisibleWeekRange } from '@/lib/utils/weekHelpers';
import { clearCache } from '@/lib/utils/cache';

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Reservation ID is required' });
  }

  try {
    const docRef = db.collection('reservations').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    await docRef.delete();

    // Clear relevant caches
    const { start, end } = getVisibleWeekRange();
    clearCache(`week:${start}:${end}`);
    clearCache(`summary:${start}:${end}`);

    res.json({ message: 'Reservation released successfully.' });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    res.status(500).json({ error: 'Failed to release reservation.' });
  }
}

export default withCors(withAuth(handler));
