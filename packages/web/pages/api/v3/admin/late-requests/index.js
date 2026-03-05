// GET /api/v3/admin/late-requests?status=pending — List late requests by status
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const status = req.query.status || 'pending';
  const validStatuses = ['pending', 'approved', 'denied'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const snap = await db
    .collection('v3_late_requests')
    .where('status', '==', status)
    .orderBy('createdAt', 'desc')
    .get();

  const requests = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return res.status(200).json({ requests });
}

export default withCors(withAdminAuth(handler));
