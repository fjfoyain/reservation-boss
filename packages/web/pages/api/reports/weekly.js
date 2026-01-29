// GET /api/reports/weekly - Get weekly attendance report
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';
import { getVisibleWeekRange } from '@/lib/utils/weekHelpers';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Weekly Report] Starting fetch...');
    const { startDate, endDate } = getVisibleWeekRange();
    console.log('[Weekly Report] Week range:', { startDate, endDate });
    
    // Get all reservations for the current week
    const snapshot = await db.collection('reservations')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    console.log('[Weekly Report] Found reservations:', snapshot.size);

    // Group by email and count unique days
    const userStats = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.email;
      const date = data.date;
      
      if (!userStats[email]) {
        userStats[email] = {
          email,
          days: new Set(),
          reservations: []
        };
      }
      
      userStats[email].days.add(date);
      userStats[email].reservations.push({
        date,
        spot: data.spot
      });
    });

    // Convert to array and format
    const report = Object.values(userStats).map(user => ({
      email: user.email,
      daysCount: user.days.size,
      reservations: user.reservations.sort((a, b) => a.date.localeCompare(b.date))
    })).sort((a, b) => b.daysCount - a.daysCount || a.email.localeCompare(b.email));

    console.log('[Weekly Report] Returning report with', report.length, 'users');
    res.status(200).json({
      weekStart: startDate,
      weekEnd: endDate,
      report
    });
  } catch (error) {
    console.error('[Weekly Report] Error:', error);
    console.error('[Weekly Report] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch weekly report', details: error.message });
  }
}

export default withAuth(withCors(handler));
