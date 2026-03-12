// PUT /api/v3/admin/rooms/[id] — Update room (name, type, capacity, active)
// DELETE /api/v3/admin/rooms/[id] — Permanently delete room
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';
import { ROOMS_COLLECTION } from '@/lib/config/constants';

async function handler(req, res) {
  const { id } = req.query;
  const docRef = db.collection(ROOMS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Room not found' });

  if (req.method === 'PUT') {
    const { name, type, capacity, active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) {
      if (!['meeting', 'calling', 'conference'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
      updates.type = type;
    }
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (active !== undefined) updates.active = Boolean(active);

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    await docRef.update(updates);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    await docRef.delete();
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAdminAuth(handler));
