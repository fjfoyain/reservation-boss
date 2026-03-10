// Authentication middleware for Next.js API routes
import { auth, db } from '@/lib/config/firebaseAdmin';
import { USERS_COLLECTION } from '@/lib/config/constants';

/**
 * Verify Firebase authentication token from Authorization header
 */
export async function verifyAuthToken(req) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }

  const idToken = authHeader.slice('Bearer '.length);

  try {
    const decoded = await auth.verifyIdToken(idToken);
    return decoded;
  } catch (error) {
    throw new Error('Unauthorized: Invalid token');
  }
}

/**
 * Middleware wrapper to require authentication
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      const user = await verifyAuthToken(req);
      req.user = user;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
}

/**
 * Middleware wrapper to require full admin access.
 * Blocks users who are People Lead ONLY (isPeopleLead: true AND NOT isAdmin).
 * Admins who are also People Leads (isAdmin: true) are allowed through.
 * Users not found in the collection are treated as full admins (no regression).
 */
export function withFullAdmin(handler) {
  return async (req, res) => {
    try {
      const user = await verifyAuthToken(req);
      req.user = user;

      const snap = await db.collection(USERS_COLLECTION)
        .where('email', '==', user.email)
        .limit(1)
        .get();

      if (!snap.empty) {
        const data = snap.docs[0].data();
        const isPLOnly = data.isPeopleLead === true && !data.isAdmin && data.role !== 'admin';
        if (isPLOnly) {
          return res.status(403).json({ error: 'Access denied: People Leads can only access approvals.' });
        }
      }

      return handler(req, res);
    } catch (error) {
      if (error.message.startsWith('Unauthorized')) {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
