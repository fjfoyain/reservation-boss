// POST /api/v3/attendance — Set or update attendance for a date
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { ATTENDANCE_COLLECTION, CONFIG_COLLECTION, BLACKOUT_DATES_COLLECTION } from '@/lib/config/constants';
import { isWeekEditable, toGye, toDateString } from '@/lib/utils/weekHelpersV3';

function getMondayOfDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { date, status } = req.body;
  if (!date || !status) return res.status(400).json({ error: 'date and status are required' });
  if (!['office', 'remote'].includes(status)) {
    return res.status(400).json({ error: 'status must be "office" or "remote"' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  // Fetch attendance config for deadline time
  const attConfigSnap = await db.collection(CONFIG_COLLECTION).doc('attendance_rules').get();
  const attConfig = attConfigSnap.exists ? attConfigSnap.data() : {};

  // Check week is editable
  const monday = getMondayOfDate(date);
  if (!isWeekEditable(monday, attConfig)) {
    return res.status(403).json({
      error: 'This week is locked. Changes require admin approval.',
      lateCancellation: true,
    });
  }

  // Check if date is a blackout date
  if (status === 'office') {
    const blackoutSnap = await db.collection(BLACKOUT_DATES_COLLECTION).where('date', '==', date).limit(1).get();
    if (!blackoutSnap.empty) {
      const blackout = blackoutSnap.docs[0].data();
      return res.status(409).json({ error: `Office is closed on this date: ${blackout.label}` });
    }
  }

  const { uid } = req.user;
  const now = new Date();

  try {
    // Upsert: query by userId only (auto-indexed), filter date in JS
    const snapshot = await db
      .collection(ATTENDANCE_COLLECTION)
      .where('userId', '==', uid)
      .get();

    const existing = snapshot.docs.find((d) => d.data().date === date);

    if (!existing) {
      await db.collection(ATTENDANCE_COLLECTION).add({
        userId: uid,
        email: req.userProfile.email,
        date,
        status,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await existing.ref.update({ status, updatedAt: now });
    }

    return res.status(200).json({ success: true, date, status });
  } catch (err) {
    console.error('attendance POST error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(withAuthV3(handler));
