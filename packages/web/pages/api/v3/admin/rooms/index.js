// GET /api/v3/admin/rooms — List all rooms (including inactive)
// POST /api/v3/admin/rooms — Create a new room
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';

async function handler(req, res) {
  if (req.method === 'GET') {
    const snap = await db.collection('v3_rooms').orderBy('type').orderBy('name').get();
    const rooms = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ rooms });
  }

  if (req.method === 'POST') {
    const { name, type, capacity } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Room name is required' });
    if (!['meeting', 'calling'].includes(type)) return res.status(400).json({ error: 'Type must be "meeting" or "calling"' });

    const docRef = await db.collection('v3_rooms').add({
      name: name.trim(),
      type,
      capacity: Number(capacity) || 1,
      active: true,
      createdAt: new Date(),
    });
    return res.status(201).json({ id: docRef.id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAdminAuth(handler));
