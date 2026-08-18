export const TZ = process.env.TIMEZONE || "Europe/London";

/** Codes stop working at 9:00 PM local. */
export const CLOSE_HOUR = 21;

function tzOffsetMs(date: Date): number {
  const parts: Record<string, string> = {};
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second
  );
  return asUTC - date.getTime();
}

function localToInstant(y: number, monthIndex: number, day: number, hour: number): Date {
  const guess = new Date(Date.UTC(y, monthIndex, day, hour, 0, 0));
  const corrected = new Date(guess.getTime() - tzOffsetMs(guess));
  // Second pass in case the offset changed across a DST boundary.
  return new Date(guess.getTime() - tzOffsetMs(corrected));
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

function shiftKey(key: string, days: number): string {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" for the local calendar day of an instant. */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** When a day's code is usable: midnight until 9:00 PM local. */
export function dayWindow(key: string): { startsAt: Date; expiresAt: Date } {
  const { y, m, d } = parseKey(key);
  return {
    startsAt: localToInstant(y, m - 1, d, 0),
    expiresAt: localToInstant(y, m - 1, d, CLOSE_HOUR),
  };
}

/** The day a code generated now should belong to: today until 9:00 PM, then tomorrow. */
export function targetDayKey(now: Date): string {
  const today = dayKey(now);
  return now < dayWindow(today).expiresAt ? today : shiftKey(today, 1);
}

/** The Monday of the week a day belongs to. */
export function weekStartKey(key: string): string {
  const { y, m, d } = parseKey(key);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return shiftKey(key, -((dow + 6) % 7));
}

function fromKey(key: string): Date {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Monday, 17 Aug" */
export function formatDay(key: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(fromKey(key));
}

/** "17 – 21 Aug" for the Monday-to-Friday span of a week. */
export function formatWeek(startKey: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  const start = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" }).format(
    fromKey(startKey)
  );
  const end = new Intl.DateTimeFormat("en-GB", opts).format(fromKey(shiftKey(startKey, 4)));
  return `${start} – ${end}`;
}

/** "YYYY-MM" for the local calendar month of an instant. */
export function monthKey(date: Date): string {
  return dayKey(date).slice(0, 7);
}

/** "August 2026" */
export function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Shifts a "YYYY-MM" key by whole months. */
export function shiftMonthKey(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "07:41" */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
