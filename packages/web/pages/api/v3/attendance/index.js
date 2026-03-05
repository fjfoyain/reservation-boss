// POST /api/v3/attendance — Set or update attendance for a date
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
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

  // Check week is editable
  const monday = getMondayOfDate(date);
  if (!isWeekEditable(monday)) {
    return res.status(403).json({
      error: 'This week is locked. Changes require admin approval.',
      lateCancellation: true,
    });
  }

  const { uid, email } = req.user;
  const now = new Date();

  // Upsert using query (userId + date is the unique key)
  const snapshot = await db
    .collection('v3_attendance')
    .where('userId', '==', uid)
    .where('date', '==', date)
    .limit(1)
    .get();

  if (snapshot.empty) {
    await db.collection('v3_attendance').add({
      userId: uid,
      email: req.userProfile.email,
      date,
      status,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await snapshot.docs[0].ref.update({ status, updatedAt: now });
  }

  return res.status(200).json({ success: true, date, status });
}

export default withCors(withAuthV3(handler));
