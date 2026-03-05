// GET /api/v3/rooms — List all active rooms
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type } = req.query; // optional filter: 'meeting' | 'calling'
  let query = db.collection('v3_rooms').where('active', '==', true);
  if (type) query = query.where('type', '==', type);

  const snapshot = await query.orderBy('name').get();
  const rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return res.status(200).json({ rooms });
}

export default withCors(withAuthV3(handler));
