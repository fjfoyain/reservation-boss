// Authentication middleware for Next.js API routes
import { auth } from '@/lib/config/firebaseAdmin';

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
