// GET /api/reservations - Get all reservations (admin only)
// DELETE /api/reservations - Clear all reservations (admin only)
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { clearCache } from '../../../lib/utils/cache';

async function handler(req, res) {
  if (req.method === 'GET') {
    // Admin: Get all reservations (limited to 500)
    try {
      const snapshot = await db
        .collection('reservations')
        .orderBy('date', 'desc')
        .limit(500)
        .get();

      const reservations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json(reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  } else if (req.method === 'DELETE') {
    // Admin: Clear all reservations
    try {
      const snapshot = await db.collection('reservations').get();

      if (snapshot.empty) {
        return res.json({ message: 'No reservations to delete.' });
      }

      const batch = db.batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // Clear all caches
      clearCache();

      res.json({ message: 'All reservations have been successfully deleted.' });
    } catch (error) {
      console.error('Error clearing reservations:', error);
      res.status(500).json({ error: 'Failed to clear reservations' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withCors(withAuth(handler));
