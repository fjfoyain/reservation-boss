// Invitation token utilities for v3 user onboarding
import { randomUUID } from 'crypto';
import { db } from '@/lib/config/firebaseAdmin';
import { INVITATIONS_COLLECTION } from '@/lib/config/constants';

const INVITE_EXPIRY_HOURS = 48;

/**
 * Generate a secure random UUID token
 */
export function generateToken() {
  return randomUUID();
}

/**
 * Validate an invite token from Firestore.
 * Returns the invitation document data if valid, throws otherwise.
 */
export async function validateInviteToken(token) {
  if (!token) throw new Error('Token is required');

  const snapshot = await db
    .collection(INVITATIONS_COLLECTION)
    .where('token', '==', token)
    .where('used', '==', false)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Invalid or already used invitation link');
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  const now = new Date();
  if (!data.expiresAt) throw new Error('Invalid invitation: missing expiration');
  const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);

  if (now > expiresAt) {
    throw new Error('Invitation link has expired');
  }

  return { id: doc.id, ...data };
}

/**
 * Create an invitation document in Firestore and return the token.
 */
export async function createInvitation(email) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.collection(INVITATIONS_COLLECTION).add({
    email: email.toLowerCase(),
    token,
    createdAt: now,
    expiresAt,
    used: false,
  });

  return token;
}

/**
 * Mark an invitation as used by its document ID.
 */
export async function markInvitationUsed(invitationId) {
  await db.collection(INVITATIONS_COLLECTION).doc(invitationId).update({ used: true });
}
