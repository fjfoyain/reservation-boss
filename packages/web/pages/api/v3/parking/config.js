// GET /api/v3/parking/config — Returns parking config (cutoffTime) for authenticated users
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const snap = await db.collection('v3_config').doc('parking_rules').get();
    const data = snap.exists ? snap.data() : {};
    return res.status(200).json({
      config: {
        cutoffTime: data.cutoffTime || '08:00',
        weeklyLimit: data.weeklyLimit || 4,
      },
    });
  } catch (err) {
    console.error('parking/config error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(withAuthV3(handler));
