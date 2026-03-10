// POST /api/v3/auth/register — Complete registration from an invite token
import { withCors } from '@/lib/middleware/cors';
import { auth, db } from '@/lib/config/firebaseAdmin';
import { validateInviteToken, markInvitationUsed } from '@/lib/utils/inviteHelpers';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, name, password } = req.body;
  if (!token || !name || !password) {
    return res.status(400).json({ error: 'token, name, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  let invitation;
  try {
    invitation = await validateInviteToken(token);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const { email, id: invitationId } = invitation;

  // Check if a Firebase user already exists for this email
  try {
    await auth.getUserByEmail(email);
    // Return generic error to prevent account enumeration
    return res.status(400).json({ error: 'Unable to complete registration. The invitation may have already been used.' });
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error('Firebase auth lookup error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  // Create Firebase Auth user
  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      email,
      password,
      displayName: name.trim(),
      emailVerified: false,
    });
  } catch (err) {
    console.error('Firebase createUser error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }

  // Create v3_users profile in Firestore
  try {
    await db.collection('v3_users').doc(firebaseUser.uid).set({
      uid: firebaseUser.uid,
      email,
      name: name.trim(),
      role: 'none',
      internalSpot: null,
      active: true,
      createdAt: new Date(),
      lastLogin: null,
    });
  } catch (err) {
    // Rollback Firebase user if Firestore write fails
    console.error('Firestore v3_users write error:', err);
    await auth.deleteUser(firebaseUser.uid).catch(() => {});
    return res.status(500).json({ error: 'Failed to create user profile. Please try again.' });
  }

  // Mark invitation as used
  await markInvitationUsed(invitationId).catch((err) => {
    console.error('Failed to mark invitation used:', err);
  });

  return res.status(201).json({ success: true, uid: firebaseUser.uid });
}

export default withCors(handler);
