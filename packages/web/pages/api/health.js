// GET /api/health - Health check endpoint
import { withCors } from '@/lib/middleware/cors';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'OK',
    service: 'Reservation Boss API',
    timestamp: new Date().toISOString(),
  });
}

export default withCors(handler);
