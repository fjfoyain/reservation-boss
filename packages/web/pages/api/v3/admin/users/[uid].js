// PUT /api/v3/admin/users/[uid] — Update user role, internalSpot, or active status
import { withAdminAuth } from '@/lib/middleware/authV3';
import { db, auth as firebaseAuth } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';

async function handler(req, res) {
  const { uid } = req.query;

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const docRef = db.collection('v3_users').doc(uid);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'User not found' });

  const { role, internalSpot, active, isAdmin, isPeopleLead, peopleLeadEmail } = req.body;
  const updates = {};

  if (isAdmin !== undefined) {
    updates.isAdmin = Boolean(isAdmin);
  }

  if (isPeopleLead !== undefined) {
    updates.isPeopleLead = Boolean(isPeopleLead);
  }

  if (peopleLeadEmail !== undefined) {
    updates.peopleLeadEmail = peopleLeadEmail || null;
  }

  if (role !== undefined) {
    const validRoles = ['internal', 'external', 'none'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role. Must be internal, external, or none' });
    updates.role = role;
    // Clear internalSpot when changing away from internal
    if (role !== 'internal') updates.internalSpot = null;
  }

  if (internalSpot !== undefined) {
    if (internalSpot !== null) {
      // Check spot is not already assigned to another active user (single-field query + JS filter)
      const existingSnap = await db.collection('v3_users').where('internalSpot', '==', internalSpot).get();
      const conflict = existingSnap.docs.find((d) => d.id !== uid && d.data().active !== false);
      if (conflict) {
        return res.status(409).json({ error: `Spot "${internalSpot}" is already assigned to another user` });
      }
    }
    updates.internalSpot = internalSpot;
  }

  if (active !== undefined) {
    updates.active = Boolean(active);
    // Disable Firebase Auth account as well
    await firebaseAuth.updateUser(uid, { disabled: !updates.active }).catch(() => {});
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  await docRef.update(updates);
  return res.status(200).json({ success: true });
}

export default withCors(withAdminAuth(handler));
