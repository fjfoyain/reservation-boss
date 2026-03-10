// PUT /api/admin/users/[id] - Update a user
// DELETE /api/admin/users/[id] - Delete a user
import { withCors } from '@/lib/middleware/cors';
import { withFullAdmin } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { validateEmail } from '@/lib/utils/validation';

async function handler(req, res) {
  const { id } = req.query;

  const docRef = db.collection('users').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'PUT') {
    const { isPeopleLead, peopleLeadEmail } = req.body;
    const updates = { updatedAt: new Date() };

    if (typeof isPeopleLead === 'boolean') {
      updates.isPeopleLead = isPeopleLead;
    }

    if (peopleLeadEmail !== undefined) {
      if (!peopleLeadEmail) {
        updates.peopleLeadEmail = null;
      } else {
        const leadValidation = validateEmail(peopleLeadEmail);
        if (!leadValidation.valid) {
          return res.status(400).json({ error: 'Invalid people lead email' });
        }

        const leadSnap = await db.collection('users')
          .where('email', '==', leadValidation.normalizedEmail)
          .where('isPeopleLead', '==', true)
          .limit(1)
          .get();
        if (leadSnap.empty) {
          return res.status(400).json({ error: 'Selected people lead not found or is not marked as a People Lead' });
        }

        updates.peopleLeadEmail = leadValidation.normalizedEmail;
      }
    }

    await docRef.update(updates);
    return res.status(200).json({ id, ...doc.data(), ...updates });
  }

  if (req.method === 'DELETE') {
    await docRef.delete();
    return res.status(200).json({ message: 'User deleted successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withFullAdmin(handler));
