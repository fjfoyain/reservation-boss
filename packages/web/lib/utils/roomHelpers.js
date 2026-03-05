// Room reservation utilities for v3

/**
 * Generate 30-minute time slots between startHour and endHour.
 * @param {number} startHour - Start hour (inclusive), e.g. 8 for 8:00 AM
 * @param {number} endHour   - End hour (exclusive), e.g. 18 for last slot at 17:30
 * @param {number} intervalMinutes - Slot length in minutes (default 30)
 * @returns {Array<{ start: string, end: string }>}  e.g. [{ start: '08:00', end: '08:30' }, ...]
 */
export function generateTimeSlots(startHour = 8, endHour = 18, intervalMinutes = 30) {
  const slots = [];
  let current = startHour * 60; // minutes from midnight
  const endMinutes = endHour * 60;

  while (current + intervalMinutes <= endMinutes) {
    const startHH = String(Math.floor(current / 60)).padStart(2, '0');
    const startMM = String(current % 60).padStart(2, '0');
    const endMinCurrent = current + intervalMinutes;
    const endHH = String(Math.floor(endMinCurrent / 60)).padStart(2, '0');
    const endMM = String(endMinCurrent % 60).padStart(2, '0');
    slots.push({ start: `${startHH}:${startMM}`, end: `${endHH}:${endMM}` });
    current += intervalMinutes;
  }
  return slots;
}

/**
 * Format a time slot for display (e.g. "08:00 – 08:30" → "8:00 AM – 8:30 AM").
 */
export function formatTimeSlot(start, end) {
  function fmt(t) {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Check if a room reservation overlaps with existing bookings.
 * All times are "HH:MM" strings.
 */
export function hasOverlap(existingReservations, roomId, date, startTime, endTime) {
  return existingReservations.some(
    (r) =>
      r.roomId === roomId &&
      r.date === date &&
      r.startTime < endTime &&
      r.endTime > startTime
  );
}
