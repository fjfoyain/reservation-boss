// PATCH /api/approvals/[id] - Approve or reject an approval request
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { sendReservationEmail, sendApprovalDecisionEmail } from '@/lib/config/email';
import { MAX_WEEKLY_RESERVATIONS, APPROVAL_REQUESTS_COLLECTION } from '@/lib/config/constants';
import { clearCache } from '@/lib/utils/cache';

// Get Mon-Fri bounds for any given YYYY-MM-DD date string
function getWeekBoundsForDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysFromMonday);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
  };
}

async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { action, notes } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
  }

  const docRef = db.collection(APPROVAL_REQUESTS_COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return res.status(404).json({ error: 'Approval request not found' });

  const request = doc.data();

  if (request.peopleLeadEmail !== req.user.email) {
    return res.status(403).json({ error: 'You are not authorized to action this request' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Request is already ${request.status}` });
  }

  const now = new Date();

  if (action === 'reject') {
    await docRef.update({
      status: 'rejected',
      notes: notes || null,
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: req.user.email,
    });

    sendApprovalDecisionEmail({
      email: request.email,
      spot: request.spot,
      date: request.date,
      approved: false,
      notes,
    }).catch(console.error);

    return res.status(200).json({ message: 'Request rejected' });
  }

  // action === 'approve': create the actual reservation inside a transaction
  const reservationsRef = db.collection('reservations');

  try {
    await db.runTransaction(async (tx) => {
      const userDateQuery = reservationsRef
        .where('date', '==', request.date)
        .where('email', '==', request.email)
        .limit(1);

      const spotQuery = reservationsRef
        .where('date', '==', request.date)
        .where('spot', '==', request.spot)
        .limit(1);

      const { start, end } = getWeekBoundsForDate(request.date);
      const weeklyQuery = reservationsRef
        .where('email', '==', request.email)
        .where('date', '>=', start)
        .where('date', '<=', end);

      const [userDateSnap, spotSnap, weeklySnap] = await Promise.all([
        tx.get(userDateQuery),
        tx.get(spotQuery),
        tx.get(weeklyQuery),
      ]);

      if (!userDateSnap.empty) {
        throw new Error('Employee already has a reservation for this date.');
      }
      if (!spotSnap.empty) {
        throw new Error(`Spot ${request.spot} is already taken for ${request.date}.`);
      }
      if (weeklySnap.size >= MAX_WEEKLY_RESERVATIONS) {
        throw new Error('Employee has reached their weekly reservation limit.');
      }

      const newDoc = reservationsRef.doc();
      tx.set(newDoc, {
        email: request.email,
        date: request.date,
        spot: request.spot,
        createdAt: now,
      });

      tx.update(docRef, {
        status: 'approved',
        updatedAt: now,
        reviewedAt: now,
        reviewedBy: req.user.email,
      });
    });

    // Clear cache
    const { start, end } = getWeekBoundsForDate(request.date);
    clearCache(`week:${start}:${end}`);
    clearCache(`summary:${start}:${end}`);

    sendReservationEmail({ email: request.email, spot: request.spot, date: request.date }).catch(console.error);
    sendApprovalDecisionEmail({ email: request.email, spot: request.spot, date: request.date, approved: true }).catch(console.error);

    return res.status(200).json({ message: 'Request approved and reservation created' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export default withCors(withAuth(handler));
