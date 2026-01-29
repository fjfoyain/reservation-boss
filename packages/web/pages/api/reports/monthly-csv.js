// GET /api/reports/monthly-csv?year=2026&month=1
import { withCors } from '@/lib/middleware/cors';
import { withAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/config/firebaseAdmin';

// Helper to get week number in month
function getWeekOfMonth(dateStr) {
  const date = new Date(dateStr + 'T12:00:00-05:00'); // Ecuador timezone
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  // Calculate week number (weeks start on Monday)
  const adjustedDay = dayOfMonth + firstDayOfWeek - 1;
  return Math.ceil(adjustedDay / 7);
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Calculate date range for the month
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get all reservations for the month
    const snapshot = await db.collection('reservations')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    // Group by email and week, count unique days
    const userWeekStats = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.email;
      const date = data.date;
      const week = getWeekOfMonth(date);
      const weekKey = `week${week}`;
      
      if (!userWeekStats[email]) {
        userWeekStats[email] = {
          email,
          weeks: {}
        };
      }
      
      if (!userWeekStats[email].weeks[weekKey]) {
        userWeekStats[email].weeks[weekKey] = new Set();
      }
      
      userWeekStats[email].weeks[weekKey].add(date);
    });

    // Determine how many weeks in the month
    const maxWeek = Math.max(
      ...Object.values(userWeekStats).flatMap(user => 
        Object.keys(user.weeks).map(w => parseInt(w.replace('week', '')))
      ),
      1
    );

    // Convert to CSV format
    const headers = ['Email'];
    for (let i = 1; i <= maxWeek; i++) {
      headers.push(`Week ${i} Days`);
    }
    headers.push('Total Days');
    
    const rows = Object.values(userWeekStats)
      .map(user => {
        const row = [user.email];
        let totalDays = 0;
        
        for (let i = 1; i <= maxWeek; i++) {
          const weekKey = `week${i}`;
          const days = user.weeks[weekKey] ? user.weeks[weekKey].size : 0;
          row.push(days);
          totalDays += days;
        }
        
        row.push(totalDays);
        return { row, totalDays, email: user.email };
      })
      .sort((a, b) => b.totalDays - a.totalDays || a.email.localeCompare(b.email))
      .map(item => item.row);

    // Generate CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Set headers for file download
    const monthName = new Date(yearNum, monthNum - 1).toLocaleString('en-US', { month: 'long' });
    const filename = `parking-report-${monthName}-${yearNum}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error generating monthly CSV:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
}

export default withAuth(withCors(handler));
