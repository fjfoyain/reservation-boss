// POST /api/v3/late-requests — Submit a late change request
// GET  /api/v3/late-requests/mine — handled in mine.js
import { withCors } from '@/lib/middleware/cors';
import { withAuthV3 } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

const COLLECTION_MAP = {
  attendance: 'v3_attendance',
  parking: 'v3_parking',
  room: 'v3_room_reservations',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function handler(req, res) {
  if (req.method === 'GET') {
    // Single-field query + JS sort to avoid composite index requirement
    const snapshot = await db
      .collection('v3_late_requests')
      .where('userId', '==', req.user.uid)
      .get();
    const requests = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?._seconds ?? 0;
        const tb = b.createdAt?._seconds ?? 0;
        return tb - ta;
      })
      .slice(0, 50);
    return res.status(200).json({ requests });
  }

  if (req.method === 'POST') {
    const { type, reservationId, date, reason } = req.body;

    if (!type || !reservationId || !date || !reason) {
      return res.status(400).json({ error: 'type, reservationId, date, and reason are required' });
    }
    if (!['attendance', 'parking', 'room'].includes(type)) {
      return res.status(400).json({ error: 'type must be attendance, parking, or room' });
    }
    if (!reason.trim()) {
      return res.status(400).json({ error: 'A reason is required' });
    }
    if (reason.length > 2000) {
      return res.status(400).json({ error: 'Reason must be 2000 characters or fewer' });
    }

    const { uid } = req.user;
    const { email, name } = req.userProfile;
    const now = new Date();

    // Verify the reservation exists and belongs to the current user
    const resDoc = await db.collection(COLLECTION_MAP[type]).doc(reservationId).get();
    if (!resDoc.exists || resDoc.data().userId !== uid) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if a pending request already exists for this reservation (JS filter to avoid composite index)
    const existing = await db
      .collection('v3_late_requests')
      .where('reservationId', '==', reservationId)
      .get();
    const hasPending = existing.docs.some((d) => d.data().status === 'pending');
    if (hasPending) {
      return res.status(409).json({ error: 'A pending request already exists for this reservation' });
    }

    const docRef = await db.collection('v3_late_requests').add({
      userId: uid,
      email,
      userName: name,
      type,
      reservationId,
      date,
      reason: reason.trim(),
      status: 'pending',
      createdAt: now,
      resolvedAt: null,
      resolvedBy: null,
    });

    // Notify admin(s)
    const dateFormatted = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
    const { sendEmail } = await import('@/lib/config/email');
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Late Request from ${String(name ?? '').replace(/[\r\n]/g, ' ').trim()} — ${dateFormatted}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #112A46; padding: 24px; border-radius: 12px 12px 0 0; border-bottom: 4px solid #00A3E0;">
            <h1 style="color: white; font-size: 20px; margin: 0;">New Late Change Request</h1>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;">Employee</td>
                <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${escapeHtml(name)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(email)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; font-size: 14px;">${dateFormatted}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Type</td>
                <td style="padding: 8px 0; font-size: 14px; text-transform: capitalize;">${escapeHtml(type)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason</td>
                <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(reason.trim())}</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <a href="${process.env.NEXT_PUBLIC_API_URL || 'https://reservationboss.io'}/admin/requests" style="display: inline-block; padding: 12px 24px; background: #1183d4; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
                Review in Admin Panel →
              </a>
            </div>
          </div>
        </div>
      `,
    }).catch((err) => console.error('Admin notification email failed:', err));

    return res.status(201).json({ success: true, id: docRef.id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withAuthV3(handler));
