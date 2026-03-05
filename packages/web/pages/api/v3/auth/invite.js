// POST /api/v3/auth/invite — Admin sends an invitation email to a new user
import { withCors } from '@/lib/middleware/cors';
import { withAdminAuth } from '@/lib/middleware/authV3';
import { createInvitation } from '@/lib/utils/inviteHelpers';
import { ALLOWED_DOMAIN } from '@/lib/config/constants';
import { transporter } from '@/lib/config/email';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(ALLOWED_DOMAIN)) {
    return res.status(400).json({ error: `Only ${ALLOWED_DOMAIN} emails are allowed` });
  }

  try {
    const token = await createInvitation(normalized);
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = process.env.APP_URL || `${proto}://${host}`;
    const registerLink = `${baseUrl}/auth/register?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: normalized,
      subject: "You're invited to North Highland Workspace",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #112A46; padding: 32px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 4px solid #00A3E0;">
            <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">NORTH HIGHLAND</h1>
            <p style="color: #00A3E0; font-size: 12px; font-weight: 600; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase;">Workspace Portal</p>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="font-size: 22px; color: #111827; font-weight: 700; margin-top: 0;">You've been invited!</h2>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              Your administrator has invited you to join the North Highland Workspace Portal, where you can manage your office attendance and parking reservations.
            </p>
            <div style="margin: 28px 0;">
              <a href="${registerLink}" style="display: inline-block; padding: 14px 32px; background: #1183d4; color: white; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none;">
                Set Up Your Account →
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px;">This invitation link expires in <strong>48 hours</strong>.</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 4px;">
              Or copy and paste this link:<br/>
              <span style="color: #1183d4; word-break: break-all;">${registerLink}</span>
            </p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              North Highland Internal Portal • Do not share this link with anyone.
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: `Invitation sent to ${normalized}` });
  } catch (err) {
    console.error('Invite error:', err);
    return res.status(500).json({ error: 'Failed to send invitation' });
  }
}

export default withCors(withAdminAuth(handler));
