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
