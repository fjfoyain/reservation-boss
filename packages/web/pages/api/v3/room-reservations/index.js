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

    let query = db.collection('v3_room_reservations').where('date', '==', date);
    if (roomType) query = query.where('roomType', '==', roomType);

    const snapshot = await query.get();
    const reservations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ reservations });
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
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date < today) return res.status(400).json({ error: 'Cannot book rooms for past dates' });

    // Fetch room to confirm it exists and is active
    const roomDoc = await db.collection('v3_rooms').doc(roomId).get();
    if (!roomDoc.exists || !roomDoc.data().active) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }
    const room = roomDoc.data();

    // Check for conflicts (same room, same date, overlapping times)
    const existingSnap = await db
      .collection('v3_room_reservations')
      .where('roomId', '==', roomId)
      .where('date', '==', date)
      .get();

    const existing = existingSnap.docs.map((d) => d.data());
    if (hasOverlap(existing, roomId, date, startTime, endTime)) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }

    // Check user doesn't already have a booking for this room/date/time
    const userConflictSnap = await db
      .collection('v3_room_reservations')
      .where('userId', '==', uid)
      .where('date', '==', date)
      .get();
    const userExisting = userConflictSnap.docs.map((d) => d.data());
    if (hasOverlap(userExisting, roomId, date, startTime, endTime)) {
      return res.status(409).json({ error: 'You already have a booking that overlaps with this time' });
    }

    const docRef = await db.collection('v3_room_reservations').add({
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

    // Send confirmation email (non-blocking)
    sendV3RoomConfirmation({
      email,
      name: name || email,
      roomName: room.name,
      roomType: room.type,
      date,
      startTime,
      endTime,
    }).catch(() => {});

    return res.status(201).json({ success: true, id: docRef.id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAuthV3(handler));
