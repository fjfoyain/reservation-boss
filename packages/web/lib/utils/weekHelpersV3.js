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
 *   - Mon–Fri before 5pm Ecuador → show current week
 *   - Fri 5pm or later / Sat / Sun → show next week
 */
export function getDefaultWeekMonday() {
  const now = toGye();
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const hour = now.getHours();
  const minute = now.getMinutes();

  let monday = getMondayOf(now);

  // After Fri 17:00 or on Sat/Sun → next week
  if ((dow === 5 && (hour > 17 || (hour === 17 && minute > 0))) || dow === 6 || dow === 0) {
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
 * Editable until Monday 11:00 PM Ecuador time of that week.
 * Returns true if the week can be edited.
 */
export function isWeekEditable(mondayStr) {
  const now = toGye();
  const monday = new Date(`${mondayStr}T00:00:00`);

  // Past weeks are never editable
  const currentMonday = getMondayOf(now);
  if (monday < currentMonday) return false;

  // Current week: editable until Mon 23:00 Ecuador
  if (toDateString(monday) === toDateString(currentMonday)) {
    const dow = now.getDay();
    if (dow === 1) { // Monday
      const hour = now.getHours();
      const minute = now.getMinutes();
      return hour < 23 || (hour === 23 && minute === 0);
    }
    if (dow > 1) return false; // Tue onward of current week → locked
    return true; // Should not happen (Mon before 11pm)
  }

  // Future weeks are always editable
  return true;
}

/**
 * Check if same-day parking can still be modified (before 8:00 AM Ecuador).
 */
export function canModifyParkingToday() {
  const now = toGye();
  return now.getHours() < 8;
}

/**
 * Check if same-day parking can be modified for a specific date.
 */
export function canModifyParking(dateStr) {
  const now = toGye();
  const today = toDateString(now);
  if (dateStr > today) return true; // future dates always OK
  if (dateStr < today) return false; // past dates never
  return now.getHours() < 8; // today: only before 8am
}
