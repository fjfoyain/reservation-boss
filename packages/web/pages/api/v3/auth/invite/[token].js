// GET /api/v3/auth/invite/[token] — Validate an invite token and return the email
import { withCors } from '@/lib/middleware/cors';
import { validateInviteToken } from '@/lib/utils/inviteHelpers';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  try {
    const invitation = await validateInviteToken(token);
    return res.status(200).json({ email: invitation.email, inviteId: invitation.id });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export default withCors(handler);
