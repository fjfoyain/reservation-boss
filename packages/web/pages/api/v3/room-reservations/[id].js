// DELETE /api/v3/room-reservations/[id] — Cancel a room booking (8am deadline)
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { canModifyParking } from '@/lib/utils/weekHelpersV3';

async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const doc = await db.collection('v3_room_reservations').doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Reservation not found' });

  const data = doc.data();
  if (data.userId !== req.user.uid) {
    return res.status(403).json({ error: 'Not authorized to cancel this reservation' });
  }

  // Enforce configurable same-day cancellation deadline
  const configSnap = await db.collection('v3_config').doc('parking_rules').get();
  const cutoffTime = configSnap.exists ? (configSnap.data().cutoffTime || '08:00') : '08:00';

  if (!canModifyParking(data.date, cutoffTime)) {
    return res.status(403).json({
      error: `Cancellation deadline has passed (${cutoffTime})`,
      lateCancellation: true,
    });
  }

  await doc.ref.delete();
  return res.status(200).json({ success: true });
}

export default withCors(withAuthV3(handler));
