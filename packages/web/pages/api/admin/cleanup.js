// POST /api/admin/cleanup - Delete old reservations (admin only)
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { getVisibleWeekRange } from '@/lib/utils/weekHelpers';
import { clearCache } from '@/lib/utils/cache';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start } = getVisibleWeekRange();

    // Query for reservations older than the first day of the current visible week
    const snapshot = await db.collection('reservations').where('date', '<', start).get();

    if (snapshot.empty) {
      return res.json({ message: 'No old reservations found to delete.' });
    }

    const batch = db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // Clear all caches
    clearCache();

    res.json({
      message: `Successfully deleted ${snapshot.size} old reservations (older than ${start}).`,
      deletedCount: snapshot.size,
    });
  } catch (error) {
    console.error('Error deleting old reservations:', error);
    res.status(500).json({ error: 'Failed to delete old reservations.' });
  }
}

export default withCors(withAuth(handler));
