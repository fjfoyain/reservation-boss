// GET /api/v3/admin/rooms — List all rooms (including inactive)
// POST /api/v3/admin/rooms — Create a new room
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';
import { ROOMS_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const snap = await db.collection(ROOMS_COLLECTION).get();
      const rooms = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
      return res.status(200).json({ rooms });
    } catch (err) {
      console.error('admin/rooms GET error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { name, type, capacity } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Room name is required' });
    if (!['meeting', 'calling', 'conference'].includes(type)) return res.status(400).json({ error: 'Type must be "meeting", "calling", or "conference"' });
    const cap = Number(capacity) || 1;
    if (cap < 1 || cap > 200) return res.status(400).json({ error: 'Capacity must be between 1 and 200' });

    const docRef = await db.collection(ROOMS_COLLECTION).add({
      name: name.trim(),
      type,
      capacity: cap,
      active: true,
      createdAt: new Date(),
    });
    return res.status(201).json({ id: docRef.id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAdminAuth(handler));
