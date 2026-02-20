// POST /api/reserve - Create a new reservation
import { withCors } from '@/lib/middleware/cors';
import { db } from '@/lib/config/firebaseAdmin';
import { sendReservationEmail } from '@/lib/config/email';
import { PARKING_SPOTS, MAX_WEEKLY_RESERVATIONS } from '@/lib/config/constants';
import { getVisibleWeekRange } from '@/lib/utils/weekHelpers';
import { validateEmail } from '@/lib/utils/validation';
import { clearCache } from '@/lib/utils/cache';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, date, spot } = req.body;

  // Validate required fields
  if (!email || !date || !spot) {
    return res.status(400).json({ error: 'Email, date, and parking spot are required' });
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  const normalizedEmail = emailValidation.normalizedEmail;

  // Validate date is within visible week
  const visibleDates = getVisibleWeekRange().dates;
  if (!visibleDates.includes(date)) {
    return res.status(400).json({ error: 'You can only reserve dates within the visible week.' });
  }

  // Validate parking spot
  if (!PARKING_SPOTS.includes(spot)) {
    return res.status(400).json({ error: 'Invalid parking spot selected.' });
  }

  const reservationsRef = db.collection('reservations');

  try {
    await db.runTransaction(async (tx) => {
      // Check if user already has a reservation for this specific date
      const userDateQuery = reservationsRef
        .where('date', '==', date)
        .where('email', '==', normalizedEmail)
        .limit(1);

      // Check if spot is already reserved for this date
      const spotQuery = reservationsRef
        .where('date', '==', date)
        .where('spot', '==', spot)
        .limit(1);

      // Check user's weekly reservation count
      const { start, end } = getVisibleWeekRange();
      const userWeeklyQuery = reservationsRef
        .where('email', '==', normalizedEmail)
        .where('date', '>=', start)
        .where('date', '<=', end);

      const [userDateSnap, spotSnap, userWeeklySnap] = await Promise.all([
        tx.get(userDateQuery),
        tx.get(spotQuery),
        tx.get(userWeeklyQuery),
      ]);

      // Check if user already has reservation for this date
      if (!userDateSnap.empty) {
        throw new Error('You can only reserve one parking spot per day.');
      }

      // Check if spot is already taken
      if (!spotSnap.empty) {
        throw new Error(`Parking spot ${spot} is already reserved for this date.`);
      }

      // Check weekly limit
      if (userWeeklySnap.size >= MAX_WEEKLY_RESERVATIONS) {
        throw new Error(
          `You can only make ${MAX_WEEKLY_RESERVATIONS} reservations per week. You currently have ${userWeeklySnap.size} reservations.`
        );
      }

      // Create new reservation with normalized email
      const newDoc = reservationsRef.doc();
      const timestamp = new Date();
      tx.set(newDoc, {
        email: normalizedEmail,
        date,
        spot,
        createdAt: timestamp,
      });
    });

    // Send confirmation email (async, don't wait)
    sendReservationEmail({ email: normalizedEmail, spot, date }).catch((err) =>
      console.error('Email sending failed:', err)
    );

    // Clear cache for this week
    const { start, end } = getVisibleWeekRange();
    clearCache(`week:${start}:${end}`);
    clearCache(`summary:${start}:${end}`);

    res.status(201).json({
      message: `Reservation successful for ${spot} on ${date}`,
      reservationDetails: {
        email: normalizedEmail,
        date,
        spot,
      },
    });
  } catch (error) {
    console.error('Reservation Error:', error.message);
    res.status(400).json({ error: error.message });
  }
}

export default withCors(handler);
