// GET  /api/v3/admin/parking-blackout  — list all blackout dates
// POST /api/v3/admin/parking-blackout  — add a blackout date
import { withCors } from '@/lib/middleware/cors';
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method === 'GET') {
    const snap = await db.collection('v3_blackout_dates').orderBy('date', 'asc').get();
    const dates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ dates });
  }

  if (req.method === 'POST') {
    const { date, label } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'label is required' });
    }

    // Check for duplicate
    const existing = await db.collection('v3_blackout_dates').where('date', '==', date).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'A blackout date already exists for this date' });
    }

    const ref = await db.collection('v3_blackout_dates').add({
      date,
      label: label.trim(),
      createdAt: new Date(),
    });

    return res.status(201).json({ id: ref.id, date, label: label.trim() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAdminAuth(handler));
