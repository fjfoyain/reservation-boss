// Week calculation utilities for Ecuador timezone
import { TIMEZONE } from '@/lib/config/constants';

/**
 * Convert date to Guayaquil (Ecuador) timezone
 */
export function toGye(date = new Date()) {
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Get the visible week range based on current date/time
 * After Friday 7pm or on weekends, shows next week
 */
export function getVisibleWeekRange() {
  const now = toGye();
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const hour = now.getHours();
  const effective = dow === 0 ? 7 : dow; // Mon=1 .. Sun=7
  const monday = new Date(now);
  monday.setDate(now.getDate() - (effective - 1));

  // After Fri 2pm (14:00), Sat, Sun -> show next week
  if ((dow === 5 && hour >= 14) || dow === 6 || dow === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
  }
  return { startDate: dates[0], endDate: dates[4], start: dates[0], end: dates[4], dates };
}

/**
 * Get visible dates with day names for UI
 */
export function getVisibleDates() {
  const { dates } = getVisibleWeekRange();
  return dates.map((dateStr) => {
    const weekday = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
    });
    return { date: dateStr, day: weekday };
  });
}
