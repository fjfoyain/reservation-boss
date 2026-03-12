// GET /api/v3/profile  — Get current user's v3 profile
// PUT /api/v3/profile  — Update display name
import { withCors } from '@/lib/middleware/cors';
import { auth as firebaseAuth, db } from '@/lib/config/firebaseAdmin';
import { USERS_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  // Verify token
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(authHeader.slice('Bearer '.length));
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    const doc = await db.collection(USERS_COLLECTION).doc(decoded.uid).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    // Update lastLogin timestamp
    await doc.ref.update({ lastLogin: new Date() }).catch(() => {});
    return res.status(200).json({ id: doc.id, ...doc.data() });
  }

  if (req.method === 'PUT') {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const docRef = db.collection(USERS_COLLECTION).doc(decoded.uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    await docRef.update({ name: name.trim() });
    // Also update Firebase Auth display name
    await firebaseAuth.updateUser(decoded.uid, { displayName: name.trim() }).catch(() => {});
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(handler);
