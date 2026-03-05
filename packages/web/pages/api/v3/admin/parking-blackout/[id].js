// DELETE /api/v3/admin/parking-blackout/[id]  — remove a blackout date
import { withCors } from '@/lib/middleware/cors';
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const ref = db.collection('v3_blackout_dates').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Blackout date not found' });

  await ref.delete();
  return res.status(200).json({ success: true });
}

export default withCors(withAdminAuth(handler));
