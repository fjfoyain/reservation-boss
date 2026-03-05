// POST /api/v3/parking — Reserve an external parking spot
// GET  /api/v3/parking/week?start= is in week.js
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { PARKING_SPOTS, MAX_WEEKLY_RESERVATIONS } from '@/lib/config/constants';
import { canModifyParking } from '@/lib/utils/weekHelpersV3';
import { sendV3ParkingConfirmation } from '@/lib/config/email';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid } = req.user;
  const { email, role, internalSpot } = req.userProfile;

  if (role !== 'external') {
    return res.status(403).json({ error: 'Only external parking users can reserve spots' });
  }

  const { date, spot } = req.body;
  if (!date || !spot) return res.status(400).json({ error: 'date and spot are required' });
  if (!PARKING_SPOTS.includes(spot)) return res.status(400).json({ error: 'Invalid parking spot' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

  const today = new Date().toISOString().split('T')[0];
  if (date < today) return res.status(400).json({ error: 'Cannot reserve parking for past dates' });

  // Check blackout dates and disabled spots in parallel
  const [blackoutSnap, configSnap] = await Promise.all([
    db.collection('v3_blackout_dates').where('date', '==', date).limit(1).get(),
    db.collection('v3_config').doc('parking_rules').get(),
  ]);

  if (!blackoutSnap.empty) {
    const blackout = blackoutSnap.docs[0].data();
    return res.status(409).json({ error: `Parking not available on this date: ${blackout.label}` });
  }

  if (configSnap.exists) {
    const cfg = configSnap.data();
    if (cfg.disabledSpots?.includes(spot)) {
      return res.status(409).json({ error: `${spot} is currently disabled for maintenance` });
    }
  }

  // Validate spot is not an internal spot
  const internalSnapshot = await db
    .collection('v3_users')
    .where('role', '==', 'internal')
    .where('internalSpot', '==', spot)
    .limit(1)
    .get();
  if (!internalSnapshot.empty) {
    return res.status(409).json({ error: `${spot} is an assigned internal spot` });
  }

  // Get the week range for weekly limit check
  const startDate = new Date(`${date}T12:00:00Z`);
  const dow = startDate.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(startDate);
  monday.setUTCDate(startDate.getUTCDate() + diff);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = friday.toISOString().split('T')[0];

  // Use Firestore transaction for atomicity
  const parkingRef = db.collection('v3_parking');

  const result = await db.runTransaction(async (t) => {
    // Check weekly limit for this user
    const userWeekQuery = parkingRef
      .where('userId', '==', uid)
      .where('date', '>=', weekStart)
      .where('date', '<=', weekEnd);
    const userWeekSnap = await t.get(userWeekQuery);
    if (userWeekSnap.size >= MAX_WEEKLY_RESERVATIONS) {
      return { error: `Maximum ${MAX_WEEKLY_RESERVATIONS} reservations per week reached` };
    }

    // Check if user already has a reservation for this date
    const userDayQuery = parkingRef.where('userId', '==', uid).where('date', '==', date);
    const userDaySnap = await t.get(userDayQuery);
    if (!userDaySnap.empty) {
      return { error: 'You already have a parking reservation for this date' };
    }

    // Check if spot is already taken for this date
    const spotQuery = parkingRef.where('spot', '==', spot).where('date', '==', date);
    const spotSnap = await t.get(spotQuery);
    if (!spotSnap.empty) {
      return { error: `${spot} is already reserved for this date` };
    }

    const newRef = parkingRef.doc();
    t.set(newRef, {
      userId: uid,
      email,
      date,
      spot,
      createdAt: new Date(),
    });
    return { id: newRef.id };
  });

  if (result.error) {
    return res.status(409).json({ error: result.error });
  }

  // Send confirmation email (non-blocking)
  sendV3ParkingConfirmation({
    email,
    name: req.userProfile.name || email,
    spot,
    date,
  }).catch(() => {});

  return res.status(201).json({ success: true, id: result.id, date, spot });
}

export default withCors(withAuthV3(handler));
