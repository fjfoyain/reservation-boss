// CORS middleware for Next.js API routes
import { ALLOWED_ORIGINS } from '@/lib/config/constants';

/**
 * Set CORS headers based on allowed origins
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }
}

/**
 * Middleware wrapper to handle CORS
 */
export function withCors(handler) {
  return async (req, res) => {
    setCorsHeaders(req, res);
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    return handler(req, res);
  };
}
