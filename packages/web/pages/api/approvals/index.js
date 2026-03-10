// GET /api/approvals - Get approval requests for the logged-in people lead
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { APPROVAL_REQUESTS_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { status } = req.query; // 'pending' | 'approved' | 'rejected' | omit for all

  let query = db.collection(APPROVAL_REQUESTS_COLLECTION)
    .where('peopleLeadEmail', '==', req.user.email);

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query = query.where('status', '==', status);
  }

  const snap = await query.orderBy('createdAt', 'desc').get();
  const approvals = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() ?? null,
    updatedAt: doc.data().updatedAt?.toDate?.() ?? null,
  }));

  return res.status(200).json(approvals);
}

export default withCors(withAuth(handler));
