// POST /api/cancellation/verify-and-cancel - Verify code and cancel reservation
import { withCors } from '@/lib/middleware/cors';
import { db } from '@/lib/config/firebaseAdmin';
import { clearCache } from '@/lib/utils/cache';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reservationId, code } = req.body;

    if (!reservationId || !code) {
      return res.status(400).json({ error: 'Reservation ID and code are required' });
    }

    // Get cancellation code document
    const codeDoc = await db.collection('cancellationCodes').doc(reservationId).get();
    
    if (!codeDoc.exists) {
      return res.status(404).json({ error: 'Invalid or expired cancellation request' });
    }

    const codeData = codeDoc.data();
    
    // Check if code has expired
    const now = new Date();
    const expiresAt = codeData.expiresAt.toDate();
    
    if (now > expiresAt) {
      // Delete expired code
      await db.collection('cancellationCodes').doc(reservationId).delete();
      return res.status(403).json({ error: 'Cancellation code has expired. Please request a new one.' });
    }

    // Verify code matches
    if (codeData.code !== code.trim()) {
      return res.status(403).json({ error: 'Invalid cancellation code' });
    }

    // Delete the reservation
    await db.collection('reservations').doc(reservationId).delete();
    
    // Delete the cancellation code
    await db.collection('cancellationCodes').doc(reservationId).delete();
    
    // Clear cache
    clearCache('reservations');

    res.status(200).json({ 
      success: true, 
      message: 'Reservation cancelled successfully' 
    });
  } catch (error) {
    console.error('Error verifying and cancelling:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
}

export default withCors(handler);
