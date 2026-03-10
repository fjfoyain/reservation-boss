// POST /api/v3/admin/users/reset-password — Send password reset email to a user
import { withCors } from '@/lib/middleware/cors';
import { withAdminAuth } from '@/lib/middleware/authV3';
import { auth } from '@/lib/config/firebaseAdmin';
import { sendEmail } from '@/lib/config/email';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid is required' });

  // Fetch user from Firebase Auth to get email
  let userRecord;
  try {
    userRecord = await auth.getUser(uid);
  } catch {
    return res.status(404).json({ error: 'User not found' });
  }

  const { email } = userRecord;

  // Generate password reset link
  let resetLink;
  try {
    resetLink = await auth.generatePasswordResetLink(email);
  } catch (err) {
    console.error('generatePasswordResetLink failed:', err);
    return res.status(500).json({ error: 'Failed to generate reset link' });
  }

  // Send reset email
  await sendEmail({
    to: email,
    subject: 'Reset your North Highland Workspace password',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#112A46;padding:28px 32px;border-radius:12px 12px 0 0;border-bottom:4px solid #00A3E0;text-align:center;">
        <h1 style="color:white;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.5px;">NORTH HIGHLAND</h1>
        <p style="color:#00A3E0;font-size:11px;font-weight:600;letter-spacing:2px;margin:6px 0 0;text-transform:uppercase;">Workspace Portal</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <h2 style="color:#111827;font-size:20px;margin-top:0;">Password Reset</h2>
        <p style="color:#374151;">An admin has requested a password reset for your account. Click the button below to set a new password.</p>
        <div style="margin:28px 0;">
          <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#1183d4;color:white;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
            Reset Password →
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;">This link will expire shortly. If you did not expect this email, you can ignore it — your password will not change.</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">North Highland Internal Portal — automated message. Do not reply.</p>
      </div>
    </div>`,
  });

  return res.status(200).json({ success: true });
}

export default withCors(withAdminAuth(handler));
