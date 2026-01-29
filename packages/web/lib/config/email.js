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
