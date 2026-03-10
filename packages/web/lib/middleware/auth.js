// Authentication middleware for Next.js API routes
import { auth, db } from '@/lib/config/firebaseAdmin';

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
 * Middleware wrapper to require full admin (blocks People Leads)
 */
export function withFullAdmin(handler) {
  return async (req, res) => {
    try {
      const user = await verifyAuthToken(req);
      req.user = user;

      const snap = await db.collection('users')
        .where('email', '==', user.email)
        .limit(1)
        .get();

      if (!snap.empty && snap.docs[0].data().isPeopleLead === true) {
        return res.status(403).json({ error: 'Access denied: People Leads can only access approvals.' });
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
