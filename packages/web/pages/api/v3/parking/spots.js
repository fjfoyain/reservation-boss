// GET /api/v3/parking/spots — Returns current parking spot list (names + types)
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { PARKING_SPOTS, CONFIG_COLLECTION } from '@/lib/config/constants';

const DEFAULT_SPOTS = PARKING_SPOTS.map((name, i) => ({
  name,
  type: i < 5 ? 'external' : 'internal',
}));

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const snap = await db.collection(CONFIG_COLLECTION).doc('parking_rules').get();
    const spots = snap.exists && snap.data().spots ? snap.data().spots : DEFAULT_SPOTS;
    return res.status(200).json({ spots });
  } catch (err) {
    console.error('parking/spots error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(withAuthV3(handler));
