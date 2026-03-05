// DELETE /api/v3/room-reservations/[id] — Cancel a room booking
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

  // Use same 8am same-day rule as parking
  if (!canModifyParking(data.date)) {
    return res.status(403).json({
      error: 'Cancellation deadline has passed (8:00 AM). Please submit a late request.',
      lateCancellation: true,
      reservationId: id,
      date: data.date,
      type: 'room',
    });
  }

  await doc.ref.delete();
  return res.status(200).json({ success: true });
}

export default withCors(withAuthV3(handler));
