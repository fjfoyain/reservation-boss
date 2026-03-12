// GET /api/v3/admin/late-requests?status=pending — List late requests by status
// Admins see all requests; people leads see only their managed users' requests
import { withPeopleLeadOrAdminAuth } from '@/lib/middleware/authV3';
import { db } from '@/lib/config/firebaseAdmin';
import { withCors } from '@/lib/middleware/cors';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const status = req.query.status || 'pending';
  const validStatuses = ['pending', 'approved', 'denied'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  // Single-field query + JS sort to avoid composite index requirement
  const snap = await db
    .collection('v3_late_requests')
    .where('status', '==', status)
    .get();

  let requests = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?._seconds ?? 0;
      const tb = b.createdAt?._seconds ?? 0;
      return tb - ta;
    });

  // People leads only see requests from users who have them as peopleLeadEmail
  if (req.isPeopleLead && !req.isAdmin) {
    const leaderEmail = req.userProfile.email;
    // Get all users managed by this people lead
    const usersSnap = await db
      .collection('v3_users')
      .where('peopleLeadEmail', '==', leaderEmail)
      .get();
    const managedUserIds = new Set(usersSnap.docs.map((doc) => doc.id));
    requests = requests.filter((r) => managedUserIds.has(r.userId));
  }

  return res.status(200).json({ requests });
}

export default withCors(withPeopleLeadOrAdminAuth(handler));
