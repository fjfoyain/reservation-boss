// PUT /api/v3/admin/late-requests/[id] — Approve or deny a late request
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';
import { sendEmail } from '@/lib/config/email';

async function sendUserEmail(to, subject, html) {
  try {
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;
  if (!['approve', 'deny'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "deny"' });
  }

  const requestRef = db.collection('v3_late_requests').doc(id);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) return res.status(404).json({ error: 'Request not found' });

  const lateRequest = { id: requestDoc.id, ...requestDoc.data() };
  if (lateRequest.status !== 'pending') {
    return res.status(409).json({ error: 'Request has already been resolved' });
  }

  const resolvedAt = new Date();
  const resolvedBy = req.user.uid;

  if (action === 'approve') {
    // Cascade-delete the underlying reservation
    const { type, reservationId } = lateRequest;
    let deleteCollection;
    if (type === 'attendance') deleteCollection = 'v3_attendance';
    else if (type === 'parking') deleteCollection = 'v3_parking';
    else if (type === 'room') deleteCollection = 'v3_room_reservations';

    if (deleteCollection && reservationId) {
      const resRef = db.collection(deleteCollection).doc(reservationId);
      const resDoc = await resRef.get();
      if (resDoc.exists) await resRef.delete();
    }

    await requestRef.update({ status: 'approved', resolvedAt, resolvedBy });

    // Email user
    const dateLabel = new Date(`${lateRequest.date}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
    await sendUserEmail(
      lateRequest.email,
      `Your late change request for ${dateLabel} was approved`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#059669;">Request Approved</h2>
        <p>Hi ${lateRequest.userName},</p>
        <p>Your late change request for <strong>${dateLabel}</strong> has been <strong>approved</strong>.</p>
        <p>The reservation has been cancelled on your behalf.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#6b7280;font-size:12px;">North Highland Workspace — automated message</p>
      </div>`,
    );
  } else {
    // Deny — just update status
    await requestRef.update({ status: 'denied', resolvedAt, resolvedBy });

    const dateLabel = new Date(`${lateRequest.date}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
    await sendUserEmail(
      lateRequest.email,
      `Your late change request for ${dateLabel} was denied`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#DC2626;">Request Denied</h2>
        <p>Hi ${lateRequest.userName},</p>
        <p>Your late change request for <strong>${dateLabel}</strong> has been <strong>denied</strong>.</p>
        <p>Your original reservation remains in place. If you have questions, please contact your admin.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#6b7280;font-size:12px;">North Highland Workspace — automated message</p>
      </div>`,
    );
  }

  return res.status(200).json({ success: true });
}

export default withCors(withAdminAuth(handler));
