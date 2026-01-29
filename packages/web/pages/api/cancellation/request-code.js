// POST /api/cancellation/request-code - Request cancellation code
import { withCors } from '@/lib/middleware/cors';
import { db } from '@/lib/config/firebaseAdmin';
import { sendCancellationCodeEmail } from '@/lib/config/email';

// Generate 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if cancellation is allowed (future days or before 8 AM on same day)
function canCancelReservation(dateStr) {
  const now = new Date();
  const reservationDate = new Date(dateStr + 'T00:00:00-05:00'); // Ecuador timezone
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const resDate = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
  
  // Future dates can always be cancelled
  if (resDate > today) {
    return true;
  }
  
  // Same day can be cancelled before 8 AM
  if (resDate.getTime() === today.getTime()) {
    const hour = now.getHours();
    return hour < 8;
  }
  
  // Past dates cannot be cancelled
  return false;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reservationId, email } = req.body;

    if (!reservationId || !email) {
      return res.status(400).json({ error: 'Reservation ID and email are required' });
    }

    // Get reservation
    const reservationDoc = await db.collection('reservations').doc(reservationId).get();
    
    if (!reservationDoc.exists) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservationDoc.data();
    
    // Verify email matches
    if (reservation.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match reservation' });
    }

    // Check if cancellation is allowed
    if (!canCancelReservation(reservation.date)) {
      return res.status(403).json({ 
        error: 'Cancellation not allowed. You can only cancel future reservations or before 8:00 AM on the reservation day.' 
      });
    }

    // Generate code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in Firestore
    await db.collection('cancellationCodes').doc(reservationId).set({
      code,
      email: email.toLowerCase(),
      reservationId,
      expiresAt,
      createdAt: new Date(),
    });

    // Send email with code
    await sendCancellationCodeEmail({
      email: email.toLowerCase(),
      code,
      spot: reservation.spot,
      date: reservation.date,
    });

    res.status(200).json({ 
      success: true, 
      message: 'Cancellation code sent to your email. It will expire in 10 minutes.' 
    });
  } catch (error) {
    console.error('Error requesting cancellation code:', error);
    res.status(500).json({ error: 'Failed to request cancellation code' });
  }
}

export default withCors(handler);
