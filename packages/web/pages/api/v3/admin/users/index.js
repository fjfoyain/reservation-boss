// GET /api/v3/admin/users — List all v3 users
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';
import { USERS_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const snap = await db.collection(USERS_COLLECTION).orderBy('name').get();
  const users = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return res.status(200).json({ users });
}

export default withCors(withAdminAuth(handler));
