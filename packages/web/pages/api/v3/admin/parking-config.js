// GET  /api/v3/admin/parking-config  — fetch global parking rules + spot statuses
// PUT  /api/v3/admin/parking-config  — update global parking rules + spot statuses
import { withCors } from '@/lib/middleware/cors';
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

const CONFIG_DOC = db.collection('v3_config').doc('parking_rules');

// Defaults if doc doesn't exist yet
const DEFAULTS = {
  weeklyLimit: 4,
  cutoffTime: '08:00',
  disabledSpots: [], // spot names disabled for maintenance
};

async function handler(req, res) {
  if (req.method === 'GET') {
    const snap = await CONFIG_DOC.get();
    const data = snap.exists ? snap.data() : DEFAULTS;
    return res.status(200).json({ config: { ...DEFAULTS, ...data } });
  }

  if (req.method === 'PUT') {
    const { weeklyLimit, cutoffTime, disabledSpots } = req.body;

    const update = {};
    if (weeklyLimit !== undefined) {
      const limit = parseInt(weeklyLimit, 10);
      if (isNaN(limit) || limit < 1 || limit > 7) {
        return res.status(400).json({ error: 'weeklyLimit must be 1–7' });
      }
      update.weeklyLimit = limit;
    }
    if (cutoffTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(cutoffTime)) {
        return res.status(400).json({ error: 'cutoffTime must be HH:MM' });
      }
      update.cutoffTime = cutoffTime;
    }
    if (disabledSpots !== undefined) {
      if (!Array.isArray(disabledSpots)) {
        return res.status(400).json({ error: 'disabledSpots must be an array' });
      }
      update.disabledSpots = disabledSpots;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await CONFIG_DOC.set(update, { merge: true });
    const updated = await CONFIG_DOC.get();
    return res.status(200).json({ config: { ...DEFAULTS, ...updated.data() } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAdminAuth(handler));
