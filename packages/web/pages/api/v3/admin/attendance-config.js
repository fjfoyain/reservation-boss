// GET  /api/v3/admin/attendance-config  — fetch global attendance rules
// PUT  /api/v3/admin/attendance-config  — update global attendance rules
import { withCors } from '@/lib/middleware/cors';
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

const CONFIG_DOC = db.collection('v3_config').doc('attendance_rules');

const DEFAULTS = {
  scheduleDeadlineTime: '23:00', // Monday lock time (HH:MM, Ecuador)
  weekSwitchTime: '17:00',       // Friday time to switch default view to next week (HH:MM, Ecuador)
};

async function handler(req, res) {
  if (req.method === 'GET') {
    const snap = await CONFIG_DOC.get();
    const data = snap.exists ? snap.data() : DEFAULTS;
    return res.status(200).json({ config: { ...DEFAULTS, ...data } });
  }

  if (req.method === 'PUT') {
    const { scheduleDeadlineTime, weekSwitchTime } = req.body;
    const update = {};

    if (scheduleDeadlineTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(scheduleDeadlineTime)) {
        return res.status(400).json({ error: 'scheduleDeadlineTime must be HH:MM' });
      }
      update.scheduleDeadlineTime = scheduleDeadlineTime;
    }

    if (weekSwitchTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(weekSwitchTime)) {
        return res.status(400).json({ error: 'weekSwitchTime must be HH:MM' });
      }
      update.weekSwitchTime = weekSwitchTime;
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
