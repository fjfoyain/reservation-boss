// Email configuration using Nodemailer
import nodemailer from 'nodemailer';

// Create transporter for sending emails
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send reservation confirmation email
export async function sendReservationEmail({ email, spot, date }) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Parking Reservation Confirmation - Reservation Boss',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Parking Reservation Confirmed</h2>
          <p>Your parking spot has been successfully reserved:</p>
          <ul style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
            <li><strong>Parking Spot:</strong> ${spot}</li>
            <li><strong>Date:</strong> ${date}</li>
            <li><strong>Email:</strong> ${email}</li>
          </ul>
          <p>Please arrive on time and park only in your designated spot.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from Reservation Boss. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

// ─── v3 Email Helpers ────────────────────────────────────────────────────────

const NH_HEADER = `
  <div style="background:#112A46;padding:28px 32px;border-radius:12px 12px 0 0;border-bottom:4px solid #00A3E0;text-align:center;">
    <h1 style="color:white;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.5px;">NORTH HIGHLAND</h1>
    <p style="color:#00A3E0;font-size:11px;font-weight:600;letter-spacing:2px;margin:6px 0 0;text-transform:uppercase;">Workspace Portal</p>
  </div>`;

const NH_FOOTER = `
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;margin:0;">North Highland Internal Portal — automated message. Do not reply.</p>`;

// v3: Parking spot reserved confirmation
export async function sendV3ParkingConfirmation({ email, name, spot, date }) {
  try {
    const dateLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Parking spot confirmed: ${spot} on ${dateLabel}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        ${NH_HEADER}
        <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#059669;font-size:20px;margin-top:0;">Parking Reserved</h2>
          <p>Hi ${name},</p>
          <p>Your parking spot has been successfully reserved.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;"><strong>Spot:</strong> ${spot}</p>
            <p style="margin:0;"><strong>Date:</strong> ${dateLabel}</p>
          </div>
          <p style="color:#6b7280;font-size:13px;">Cancellations must be made before 8:00 AM on the day of the reservation.</p>
          ${NH_FOOTER}
        </div>
      </div>`,
    });
    return { success: true };
  } catch (err) {
    console.error('v3 parking email failed:', err);
    return { success: false };
  }
}

// v3: Room reservation confirmation
export async function sendV3RoomConfirmation({ email, name, roomName, roomType, date, startTime, endTime }) {
  try {
    const dateLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
    const typeLabel = roomType === 'calling' ? 'Calling Booth' : 'Meeting Room';
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Room booked: ${roomName} on ${dateLabel} ${startTime}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        ${NH_HEADER}
        <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1183d4;font-size:20px;margin-top:0;">Room Booked</h2>
          <p>Hi ${name},</p>
          <p>Your room has been successfully reserved.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;"><strong>Room:</strong> ${roomName} (${typeLabel})</p>
            <p style="margin:0 0 6px;"><strong>Date:</strong> ${dateLabel}</p>
            <p style="margin:0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
          </div>
          <p style="color:#6b7280;font-size:13px;">To cancel, log in to the portal before 8:00 AM on the day of the booking.</p>
          ${NH_FOOTER}
        </div>
      </div>`,
    });
    return { success: true };
  } catch (err) {
    console.error('v3 room email failed:', err);
    return { success: false };
  }
}

// v3: Notify admins of a new late request (sent to one admin email address)
export async function sendV3LateRequestNotification({ adminEmail, userName, userEmail, date, type, reason }) {
  try {
    const dateLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
    const TYPE_LABELS = { attendance: 'Attendance', parking: 'Parking', room: 'Room' };
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New late change request from ${userName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        ${NH_HEADER}
        <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#f59e0b;font-size:20px;margin-top:0;">New Late Change Request</h2>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;"><strong>Employee:</strong> ${userName} (${userEmail})</p>
            <p style="margin:0 0 6px;"><strong>Date:</strong> ${dateLabel}</p>
            <p style="margin:0 0 6px;"><strong>Type:</strong> ${TYPE_LABELS[type] || type}</p>
            <p style="margin:0;"><strong>Reason:</strong> ${reason}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_API_URL || 'https://reservationboss.io'}/admin/requests"
             style="display:inline-block;padding:12px 24px;background:#1183d4;color:white;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
            Review Request →
          </a>
          ${NH_FOOTER}
        </div>
      </div>`,
    });
    return { success: true };
  } catch (err) {
    console.error('v3 late request notification failed:', err);
    return { success: false };
  }
}

// ─── End v3 Email Helpers ─────────────────────────────────────────────────────

// Send cancellation code email
export async function sendCancellationCodeEmail({ email, code, spot, date }) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Parking Cancellation Code - Reservation Boss',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Parking Cancellation Request</h2>
          <p>You have requested to cancel your parking reservation:</p>
          <ul style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
            <li><strong>Parking Spot:</strong> ${spot}</li>
            <li><strong>Date:</strong> ${date}</li>
            <li><strong>Email:</strong> ${email}</li>
          </ul>
          <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">Your cancellation code is:</p>
            <h1 style="color: #dc2626; font-size: 36px; letter-spacing: 8px; margin: 10px 0;">${code}</h1>
            <p style="margin: 0; font-size: 12px; color: #92400e;">This code will expire in 10 minutes.</p>
          </div>
          <p><strong>Important:</strong> Reservations can only be cancelled for future days, or before 8:00 AM on the reservation day.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from Reservation Boss. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Cancellation email failed:', error);
    return { success: false, error: error.message };
  }
}
