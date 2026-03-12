// GET /api/admin/users - List all users
// POST /api/admin/users - Create a user
import { withCors } from '@/lib/middleware/cors';
import { withFullAdmin } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { USERS_COLLECTION } from '@/lib/config/constants';
import { validateEmail } from '@/lib/utils/validation';

async function handler(req, res) {
  if (req.method === 'GET') {
    const snap = await db.collection(USERS_COLLECTION).orderBy('email').get();
    const users = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.() ?? null,
    }));
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const { email, isPeopleLead = false, peopleLeadEmail = null } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) return res.status(400).json({ error: emailValidation.error });

    const normalizedEmail = emailValidation.normalizedEmail;

    // Check duplicate
    const existing = await db.collection(USERS_COLLECTION)
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();
    if (!existing.empty) return res.status(409).json({ error: 'User already exists' });

    // Validate people lead if provided
    let normalizedLeadEmail = null;
    if (peopleLeadEmail) {
      const leadValidation = validateEmail(peopleLeadEmail);
      if (!leadValidation.valid) return res.status(400).json({ error: 'Invalid people lead email' });
      normalizedLeadEmail = leadValidation.normalizedEmail;

      const leadSnap = await db.collection(USERS_COLLECTION)
        .where('email', '==', normalizedLeadEmail)
        .where('isPeopleLead', '==', true)
        .limit(1)
        .get();
      if (leadSnap.empty) {
        return res.status(400).json({ error: 'Selected people lead not found or is not marked as a People Lead' });
      }
    }

    const now = new Date();
    const newDoc = await db.collection(USERS_COLLECTION).add({
      email: normalizedEmail,
      isPeopleLead: !!isPeopleLead,
      peopleLeadEmail: normalizedLeadEmail,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      id: newDoc.id,
      email: normalizedEmail,
      isPeopleLead: !!isPeopleLead,
      peopleLeadEmail: normalizedLeadEmail,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCors(withFullAdmin(handler));
