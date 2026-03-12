// v3 Authentication middleware — verifies Firebase token + checks v3_users role
import { auth, db } from '@/lib/config/firebaseAdmin';

/**
 * Verify Firebase ID token and return decoded user.
 */
async function verifyToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }
  const idToken = authHeader.slice('Bearer '.length);
  return auth.verifyIdToken(idToken);
}

/**
 * Fetch the v3_users profile for a given uid.
 */
async function getUserProfile(uid) {
  const doc = await db.collection('v3_users').doc(uid).get();
  if (!doc.exists) throw new Error('Unauthorized: User profile not found');
  return { id: doc.id, ...doc.data() };
}

/**
 * Middleware: require authenticated user (any role).
 * Attaches req.user (decoded token) and req.userProfile (v3_users doc).
 */
export function withAuthV3(handler) {
  return async (req, res) => {
    try {
      const decoded = await verifyToken(req);
      const profile = await getUserProfile(decoded.uid);
      if (!profile.active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }
      req.user = decoded;
      req.userProfile = profile;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
}

/**
 * Middleware: require admin role.
 */
export function withAdminAuth(handler) {
  return async (req, res) => {
    try {
      const decoded = await verifyToken(req);
      const profile = await getUserProfile(decoded.uid);
      if (!profile.active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }
      // isAdmin is the new field; role === 'admin' kept for backwards compatibility
      if (!profile.isAdmin && profile.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      req.user = decoded;
      req.userProfile = profile;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
}

/**
 * Middleware: require admin OR people lead role.
 * Sets req.isAdmin and req.isPeopleLead flags.
 */
export function withPeopleLeadOrAdminAuth(handler) {
  return async (req, res) => {
    try {
      const decoded = await verifyToken(req);
      const profile = await getUserProfile(decoded.uid);
      if (!profile.active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }
      const isAdmin = !!(profile.isAdmin || profile.role === 'admin');
      const isPeopleLead = !!profile.isPeopleLead;
      if (!isAdmin && !isPeopleLead) {
        return res.status(403).json({ error: 'Forbidden: Admin or People Lead access required' });
      }
      req.user = decoded;
      req.userProfile = profile;
      req.isAdmin = isAdmin;
      req.isPeopleLead = isPeopleLead;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
}
