// GET /api/auth/role - Returns the role of the currently authenticated user
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const snap = await db.collection('users')
    .where('email', '==', req.user.email)
    .limit(1)
    .get();

  if (snap.empty) {
    return res.status(200).json({ isPeopleLead: false });
  }

  const data = snap.docs[0].data();
  return res.status(200).json({ isPeopleLead: data.isPeopleLead === true });
}

export default withCors(withAuth(handler));
