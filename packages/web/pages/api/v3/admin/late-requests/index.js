// GET /api/v3/admin/late-requests?status=pending — List late requests by status
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const status = req.query.status || 'pending';
  const validStatuses = ['pending', 'approved', 'denied'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  // Single-field query + JS sort to avoid composite index requirement
  const snap = await db
    .collection('v3_late_requests')
    .where('status', '==', status)
    .get();

  const requests = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?._seconds ?? 0;
      const tb = b.createdAt?._seconds ?? 0;
      return tb - ta;
    });
  return res.status(200).json({ requests });
}

export default withCors(withAdminAuth(handler));
