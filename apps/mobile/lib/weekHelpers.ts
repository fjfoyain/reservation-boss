// Mirrors web app's weekHelpersV3.js — Ecuador timezone (UTC-5)
const ECU_OFFSET_MS = -5 * 60 * 60 * 1000;

function toEcuador(d: Date = new Date()): Date {
  return new Date(d.getTime() + ECU_OFFSET_MS);
}

function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayEcuador(): string {
  return toDateStr(toEcuador());
}

export function getWeekDates(
  mondayStr: string,
): Array<{ date: string; label: string; dayNum: number }> {
  const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const base = new Date(`${mondayStr}T00:00:00Z`);
  return LABELS.map((label, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: toDateStr(d), label, dayNum: d.getUTCDate() };
  });
}

export function getDefaultWeekMonday(): string {
  const now = toEcuador(new Date());
  const dow = now.getUTCDay(); // 0=Sun, 5=Fri
  const hour = now.getUTCHours();

  if ((dow === 5 && hour >= 17) || dow === 6) {
    // Fri 5pm+ or Sat → next Monday
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + (dow === 5 ? 3 : 2));
    return toDateStr(d);
  }
  if (dow === 0) {
    // Sunday → next Monday
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    return toDateStr(d);
  }
  // Mon–Fri (before Fri 5pm): current Monday
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return toDateStr(d);
}

export function getPrevMonday(mondayStr: string): string {
  const d = new Date(`${mondayStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return toDateStr(d);
}

export function getNextMonday(mondayStr: string): string {
  const d = new Date(`${mondayStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return toDateStr(d);
}

export function isWeekEditable(mondayStr: string): boolean {
  const now = toEcuador(new Date());
  const dow = now.getUTCDay();
  // Calendar Monday of the current week
  const offset = dow === 0 ? -6 : 1 - dow;
  const cal = new Date(now);
  cal.setUTCDate(cal.getUTCDate() + offset);
  const calMondayStr = toDateStr(cal);

  if (mondayStr < calMondayStr) return false; // past week

  if (mondayStr === calMondayStr) {
    if (dow !== 1) return false; // Tue–Sun: locked
    if (now.getUTCHours() >= 23) return false; // Mon 11pm+: locked
  }

  return true;
}

export function canModifyToday(dateStr: string): boolean {
  const now = toEcuador(new Date());
  const today = toDateStr(now);
  if (dateStr > today) return true; // future
  if (dateStr < today) return false; // past
  return now.getUTCHours() < 8; // same day: before 8am only
}

export function formatWeekHeader(mondayStr: string): string {
  const start = new Date(`${mondayStr}T00:00:00Z`);
  const end = new Date(`${mondayStr}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 4);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()} – ${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Returns current Ecuador time as "HH:MM" (rounded down to the half-hour) */
export function currentTimeEcuador(): string {
  const now = toEcuador(new Date());
  const h = String(now.getUTCHours()).padStart(2, '0');
  const m = now.getUTCMinutes() >= 30 ? '30' : '00';
  return `${h}:${m}`;
}

export function prevDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return toDateStr(d);
}

export function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return toDateStr(d);
}
