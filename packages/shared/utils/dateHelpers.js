/**
 * Date and week utilities for parking reservations
 * Timezone: America/Guayaquil
 */

const TIMEZONE = "America/Guayaquil";

/**
 * Converts a date to Guayaquil timezone
 * @param {Date} date - Date to convert (defaults to now)
 * @returns {Date}
 */
export function toGuayaquilTime(date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: TIMEZONE }));
}

/**
 * Gets the visible week range for parking reservations
 * Shows current week Mon-Fri, or next week if after Friday 7pm/weekend
 * @returns {{start: string, end: string, dates: string[]}}
 */
export function getVisibleWeekRange() {
  const now = toGuayaquilTime();
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const hour = now.getHours();
  const effective = dow === 0 ? 7 : dow; // Mon=1 .. Sun=7
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - (effective - 1));

  // After Fri 6pm, Sat, Sun -> show next week
  if ((dow === 5 && hour >= 19) || dow === 6 || dow === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split("T")[0]); // YYYY-MM-DD
  }
  
  return { start: dates[0], end: dates[4], dates };
}

/**
 * Gets visible dates with day labels for UI
 * @returns {Array<{date: string, day: string}>}
 */
export function getVisibleDates() {
  const { dates } = getVisibleWeekRange();
  return dates.map((dateStr) => {
    const weekday = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-US", { 
      weekday: "long" 
    });
    return { date: dateStr, day: weekday };
  });
}

/**
 * Formats a date string to readable format
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string}
 */
export function formatDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return date.toLocaleDateString("en-US", { 
    weekday: "short",
    month: "short", 
    day: "numeric" 
  });
}
