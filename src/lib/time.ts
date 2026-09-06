export const DEALERSHIP_TZ = "America/Chicago";

function tzParts(date: Date, tz = DEALERSHIP_TZ) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function ymdInTz(date: Date, tz = DEALERSHIP_TZ): string {
  const { year, month, day } = tzParts(date, tz);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function hmInTz(date: Date, tz = DEALERSHIP_TZ): string {
  const { hour, minute } = tzParts(date, tz);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Interpret a calendar date + time in the dealership timezone. */
export function parseInTz(
  ymd: string,
  hm: string,
  tz = DEALERSHIP_TZ,
): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = hm.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const shown = tzParts(utcGuess, tz);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const actual = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
  );
  return new Date(utcGuess.getTime() + (desired - actual));
}

export function startOfDayInTz(date: Date, tz = DEALERSHIP_TZ): Date {
  return parseInTz(ymdInTz(date, tz), "00:00", tz);
}

export function endOfDayInTz(date: Date, tz = DEALERSHIP_TZ): Date {
  return parseInTz(ymdInTz(date, tz), "23:59", tz);
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

export function toDatetimeLocalValue(date: Date, tz = DEALERSHIP_TZ): string {
  return `${ymdInTz(date, tz)}T${hmInTz(date, tz)}`;
}

export function fromDatetimeLocalValue(
  value: string,
  tz = DEALERSHIP_TZ,
): Date {
  const [ymd, time] = value.split("T");
  const hm = (time ?? "00:00").slice(0, 5);
  return parseInTz(ymd, hm, tz);
}

export function formatDateTime(date: Date, tz = DEALERSHIP_TZ): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(date: Date, tz = DEALERSHIP_TZ): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRelativeDue(dueAt: Date, now = new Date()): string {
  const dueDay = ymdInTz(dueAt);
  const today = ymdInTz(now);
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: DEALERSHIP_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(dueAt);

  if (dueDay < today) {
    return `Overdue · ${formatDate(dueAt)} ${clock}`;
  }
  if (dueDay === today) {
    return `Today ${clock}`;
  }
  const tomorrow = addCalendarDays(today, 1);
  if (dueDay === tomorrow) {
    return `Tomorrow ${clock}`;
  }
  return formatDateTime(dueAt);
}

export function isOverdue(dueAt: Date, now = new Date()): boolean {
  return dueAt.getTime() < startOfDayInTz(now).getTime();
}

export function isDueToday(dueAt: Date, now = new Date()): boolean {
  return ymdInTz(dueAt) === ymdInTz(now);
}
