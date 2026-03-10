// GET  /api/v3/room-reservations?date=YYYY-MM-DD&roomType=meeting — Get all room bookings for a date
// POST /api/v3/room-reservations — Book a time slot
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { hasOverlap } from '@/lib/utils/roomHelpers';
import { sendV3RoomConfirmation } from '@/lib/config/email';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { date, roomType } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    try {
      const snapshot = await db.collection('v3_room_reservations').where('date', '==', date).get();
      let reservations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (roomType) reservations = reservations.filter((r) => r.roomType === roomType);
      return res.status(200).json({ reservations });
    } catch (err) {
      console.error('room-reservations GET error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { uid } = req.user;
    const { email, name } = req.userProfile;
    const { roomId, date, startTime, endTime } = req.body;

    if (!roomId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'roomId, date, startTime, and endTime are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return res.status(400).json({ error: 'startTime and endTime must be HH:MM' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date < today) return res.status(400).json({ error: 'Cannot book rooms for past dates' });

    try {
      // Fetch room to confirm it exists and is active
      const roomDoc = await db.collection('v3_rooms').doc(roomId).get();
      if (!roomDoc.exists || !roomDoc.data().active) {
        return res.status(404).json({ error: 'Room not found or inactive' });
      }
      const room = roomDoc.data();

      // Use a transaction to prevent race conditions (double-booking same slot)
      const resRef = db.collection('v3_room_reservations');
      let newDocId;
      try {
        newDocId = await db.runTransaction(async (t) => {
          const [existingSnap, userConflictSnap] = await Promise.all([
            t.get(resRef.where('roomId', '==', roomId)),
            t.get(resRef.where('userId', '==', uid)),
          ]);

          const existing = existingSnap.docs.map((d) => d.data()).filter((r) => r.date === date);
          if (hasOverlap(existing, roomId, date, startTime, endTime)) {
            throw new Error('This time slot is already booked');
          }

          const userExisting = userConflictSnap.docs.map((d) => d.data()).filter((r) => r.date === date);
          if (hasOverlap(userExisting, roomId, date, startTime, endTime)) {
            throw new Error('You already have a booking that overlaps with this time');
          }

          const newDocRef = resRef.doc();
          t.set(newDocRef, {
            userId: uid,
            email,
            userName: name,
            roomId,
            roomName: room.name,
            roomType: room.type,
            date,
            startTime,
            endTime,
            createdAt: new Date(),
          });
          return newDocRef.id;
        });
      } catch (txErr) {
        if (txErr.message.includes('already') || txErr.message.includes('overlaps')) {
          return res.status(409).json({ error: txErr.message });
        }
        throw txErr;
      }

      // Send confirmation email (non-blocking)
      sendV3RoomConfirmation({
        email,
        name: name || email,
        roomName: room.name,
        roomType: room.type,
        date,
        startTime,
        endTime,
      }).catch((err) => console.error('Room email failed:', err));

      return res.status(201).json({ success: true, id: newDocId });
    } catch (err) {
      console.error('room-reservations POST error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAuthV3(handler));
