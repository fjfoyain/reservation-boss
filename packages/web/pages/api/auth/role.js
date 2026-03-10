// GET /api/auth/role - Returns the role of the currently authenticated user
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { USERS_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const snap = await db.collection(USERS_COLLECTION)
    .where('email', '==', req.user.email)
    .limit(1)
    .get();

  if (snap.empty) {
    return res.status(200).json({ isPeopleLead: false });
  }

  const data = snap.docs[0].data();
  // Admins (isAdmin or legacy role === 'admin') are never redirected to the PL portal,
  // even if they're also marked as a People Lead.
  const isAdmin = data.isAdmin === true || data.role === 'admin';
  return res.status(200).json({ isPeopleLead: data.isPeopleLead === true && !isAdmin });
}

export default withCors(withAuth(handler));
