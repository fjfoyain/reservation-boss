// v3 Week calculation utilities — Ecuador timezone, updated rules
import { TIMEZONE } from '@/lib/config/constants';

/**
 * Convert a date to Ecuador (Guayaquil) timezone.
 */
export function toGye(date = new Date()) {
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Get the Monday of a week for a given date (Ecuador timezone).
 */
function getMondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a date as YYYY-MM-DD.
 */
export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get Mon–Fri dates for a week starting on the given Monday (YYYY-MM-DD).
 */
export function getWeekDates(mondayStr) {
  const monday = new Date(`${mondayStr}T12:00:00Z`);
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toDateString(d);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const dayNum = d.getUTCDate();
    dates.push({ date: dateStr, label, dayNum });
  }
  return dates;
}

/**
 * Get the default "visible" week Monday (YYYY-MM-DD) based on current Ecuador time.
 *
 * v3 rule:
 *   - Mon–Fri before weekSwitchTime Ecuador → show current week
 *   - Fri at/after weekSwitchTime / Sat / Sun → show next week
 *
 * @param {object} [config] - Optional config. Defaults to system defaults if not provided.
 * @param {string} [config.weekSwitchTime='17:00'] - HH:MM time on Friday to switch to next week view.
 */
export function getDefaultWeekMonday(config = {}) {
  const switchTime = config.weekSwitchTime || '17:00';
  const [sh, sm] = switchTime.split(':').map(Number);

  const now = toGye();
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const hour = now.getHours();
  const minute = now.getMinutes();

  let monday = getMondayOf(now);

  // After Fri [switchTime] or on Sat/Sun → next week
  if ((dow === 5 && (hour > sh || (hour === sh && minute >= sm))) || dow === 6 || dow === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  return toDateString(monday);
}

/**
 * Get the Monday of the previous week from a given Monday string.
 */
export function getPrevMonday(mondayStr) {
  const d = new Date(`${mondayStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return toDateString(d);
}

/**
 * Get the Monday of the next week from a given Monday string.
 */
export function getNextMonday(mondayStr) {
  const d = new Date(`${mondayStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return toDateString(d);
}

/**
 * Determine if a given week (by Monday string) is still editable.
 *
 * Editable until Monday at scheduleDeadlineTime Ecuador time of that week.
 * Returns true if the week can be edited.
 *
 * @param {string} mondayStr - YYYY-MM-DD of the week's Monday.
 * @param {object} [config] - Optional config. Defaults to system defaults if not provided.
 * @param {string} [config.scheduleDeadlineTime='23:00'] - HH:MM deadline on Monday for that week.
 */
export function isWeekEditable(mondayStr, config = {}) {
  const deadlineTime = config.scheduleDeadlineTime || '23:00';
  const [dh, dm] = deadlineTime.split(':').map(Number);

  const now = toGye();
  const monday = new Date(`${mondayStr}T12:00:00Z`);

  // Past weeks are never editable
  const currentMonday = getMondayOf(now);
  if (monday < currentMonday) return false;

  // Current week: editable until Mon [deadlineTime] Ecuador
  if (toDateString(monday) === toDateString(currentMonday)) {
    const dow = now.getDay();
    if (dow === 1) { // Monday
      const hour = now.getHours();
      const minute = now.getMinutes();
      return hour < dh || (hour === dh && minute <= dm);
    }
    if (dow > 1) return false; // Tue onward of current week → locked
    return true;
  }

  // Future weeks are always editable
  return true;
}

/**
 * Check if same-day parking can still be modified (before cutoff time Ecuador).
 * @param {string} [cutoffTime='08:00'] - HH:MM cutoff from admin parking config.
 */
export function canModifyParkingToday(cutoffTime = '08:00') {
  const now = toGye();
  const [ch, cm] = cutoffTime.split(':').map(Number);
  const hour = now.getHours();
  const minute = now.getMinutes();
  return hour < ch || (hour === ch && minute < cm);
}

/**
 * Check if same-day parking can be modified for a specific date.
 * @param {string} dateStr - YYYY-MM-DD date to check.
 * @param {string} [cutoffTime='08:00'] - HH:MM cutoff from admin parking config.
 */
export function canModifyParking(dateStr, cutoffTime = '08:00') {
  const now = toGye();
  const today = toDateString(now);
  if (dateStr > today) return true; // future dates always OK
  if (dateStr < today) return false; // past dates never
  return canModifyParkingToday(cutoffTime); // today: only before cutoff
}
