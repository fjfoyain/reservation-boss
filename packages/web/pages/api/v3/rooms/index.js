// GET /api/v3/rooms — List all active rooms
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type } = req.query; // optional filter: 'meeting' | 'calling'

  try {
    const snapshot = await db.collection('v3_rooms').where('active', '==', true).get();
    let rooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (type) rooms = rooms.filter((r) => r.type === type);
    rooms.sort((a, b) => a.name.localeCompare(b.name));
    return res.status(200).json({ rooms });
  } catch (err) {
    console.error('rooms/index error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withCors(withAuthV3(handler));
