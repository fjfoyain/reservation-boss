// DELETE /api/v3/parking/[id] — Cancel a parking reservation
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { canModifyParking } from '@/lib/utils/weekHelpersV3';

async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Reservation ID is required' });

  const doc = await db.collection('v3_parking').doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Reservation not found' });

  const data = doc.data();
  if (data.userId !== req.user.uid) {
    return res.status(403).json({ error: 'Not authorized to cancel this reservation' });
  }

  if (!canModifyParking(data.date)) {
    return res.status(403).json({
      error: 'Cancellation deadline has passed (8:00 AM). Please submit a late request.',
      lateCancellation: true,
    });
  }

  await doc.ref.delete();
  return res.status(200).json({ success: true });
}

export default withCors(withAuthV3(handler));
