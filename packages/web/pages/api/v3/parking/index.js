// POST /api/v3/parking — Reserve an external parking spot
// GET  /api/v3/parking/week?start= is in week.js
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { PARKING_SPOTS, MAX_WEEKLY_RESERVATIONS, PARKING_COLLECTION, BLACKOUT_DATES_COLLECTION, CONFIG_COLLECTION, USERS_COLLECTION } from '@/lib/config/constants';
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
    db.collection(BLACKOUT_DATES_COLLECTION).where('date', '==', date).limit(1).get(),
    db.collection(CONFIG_COLLECTION).doc('parking_rules').get(),
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

  // Validate spot is not an internal spot (single-field query + JS filter)
  const internalSnapshot = await db
    .collection(USERS_COLLECTION)
    .where('internalSpot', '==', spot)
    .get();
  if (internalSnapshot.docs.some((d) => d.data().role === 'internal')) {
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

  const parkingRef = db.collection(PARKING_COLLECTION);

  // Use a transaction to prevent race conditions (double-booking, exceeding weekly limit)
  let newDocId;
  try {
    newDocId = await db.runTransaction(async (t) => {
      const [userParkingSnap, spotParkingSnap] = await Promise.all([
        t.get(parkingRef.where('userId', '==', uid)),
        t.get(parkingRef.where('spot', '==', spot)),
      ]);

      const userParking = userParkingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Check weekly limit
      const weeklyCount = userParking.filter((p) => p.date >= weekStart && p.date <= weekEnd).length;
      if (weeklyCount >= MAX_WEEKLY_RESERVATIONS) {
        throw new Error(`Maximum ${MAX_WEEKLY_RESERVATIONS} reservations per week reached`);
      }

      // Check duplicate for this date
      if (userParking.some((p) => p.date === date)) {
        throw new Error('You already have a parking reservation for this date');
      }

      // Check if spot is already taken for this date
      if (spotParkingSnap.docs.some((d) => d.data().date === date)) {
        throw new Error(`${spot} is already reserved for this date`);
      }

      const newDocRef = parkingRef.doc();
      t.set(newDocRef, { userId: uid, email, date, spot, createdAt: new Date() });
      return newDocRef.id;
    });
  } catch (err) {
    if (err.message.includes('Maximum') || err.message.includes('already') || err.message.includes('reserved')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Parking transaction error:', err);
    return res.status(500).json({ error: 'Failed to reserve parking spot. Please try again.' });
  }

  // Send confirmation email (non-blocking)
  sendV3ParkingConfirmation({
    email,
    name: req.userProfile.name || email,
    spot,
    date,
  }).catch((err) => console.error('Parking email failed:', err));

  return res.status(201).json({ success: true, id: newDocId, date, spot });
}

export default withCors(withAuthV3(handler));
