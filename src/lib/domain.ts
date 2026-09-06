import type { LeadStatus, TaskType } from "@prisma/client";
import { addCalendarDays, parseInTz, ymdInTz } from "@/lib/time";

export const PHONE_OR_EMAIL_ERROR = "Phone or email required";

export const TERMINAL_STATUSES: LeadStatus[] = ["SOLD", "LOST", "DEAD"];

export function isTerminal(status: LeadStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function requirePhoneOrEmail(
  phone?: string | null,
  email?: string | null,
): string | null {
  if (!phone?.trim() && !email?.trim()) {
    return PHONE_OR_EMAIL_ERROR;
  }
  return null;
}

export function promoteNewToWorking(status: LeadStatus): LeadStatus {
  return status === "NEW" ? "WORKING" : status;
}

export function canMarkSold(status: LeadStatus): boolean {
  return status === "NEW" || status === "WORKING" || status === "APPT_SET";
}

export function canMarkLostOrDead(status: LeadStatus): boolean {
  return !isTerminal(status);
}

export function statusLabel(status: LeadStatus): string {
  switch (status) {
    case "NEW":
      return "New";
    case "WORKING":
      return "Working";
    case "APPT_SET":
      return "Appt set";
    case "SOLD":
      return "Sold";
    case "LOST":
      return "Lost";
    case "DEAD":
      return "Dead";
  }
}

export const STATUS_FILTERS: Array<{ value: LeadStatus | "ALL"; label: string }> =
  [
    { value: "ALL", label: "All" },
    { value: "NEW", label: "New" },
    { value: "WORKING", label: "Working" },
    { value: "APPT_SET", label: "Appt set" },
    { value: "SOLD", label: "Sold" },
    { value: "LOST", label: "Lost" },
    { value: "DEAD", label: "Dead" },
  ];

export type NextTouchPreset =
  | "call_today"
  | "call_tomorrow"
  | "text_today"
  | "follow_up_2d"
  | "skip";

export const NEXT_TOUCH_CHIPS: Array<{
  value: NextTouchPreset;
  label: string;
}> = [
  { value: "call_today", label: "Call today" },
  { value: "call_tomorrow", label: "Call tomorrow" },
  { value: "text_today", label: "Text today" },
  { value: "follow_up_2d", label: "Follow up in 2 days" },
  { value: "skip", label: "Skip once" },
];

export type NextTouchDraft = {
  type: TaskType;
  title: string;
  dueAt: Date;
};

export function nextTouchFromPreset(
  preset: NextTouchPreset,
  now = new Date(),
): NextTouchDraft | null {
  if (preset === "skip") return null;

  const today = ymdInTz(now);

  switch (preset) {
    case "call_today":
      return {
        type: "CALL",
        title: "Call",
        dueAt: parseInTz(today, "17:00"),
      };
    case "call_tomorrow":
      return {
        type: "CALL",
        title: "Call",
        dueAt: parseInTz(addCalendarDays(today, 1), "10:00"),
      };
    case "text_today":
      return {
        type: "TEXT",
        title: "Text",
        dueAt: parseInTz(today, "17:00"),
      };
    case "follow_up_2d":
      return {
        type: "FOLLOW_UP",
        title: "Follow up",
        dueAt: parseInTz(addCalendarDays(today, 2), "10:00"),
      };
  }
}

export function taskTypeLabel(type: TaskType): string {
  switch (type) {
    case "CALL":
      return "Call";
    case "TEXT":
      return "Text";
    case "EMAIL":
      return "Email";
    case "APPOINTMENT":
      return "Appointment";
    case "FOLLOW_UP":
      return "Follow up";
    case "OTHER":
      return "Task";
  }
}

export const LOST_REASON_CHIPS = [
  "Bought elsewhere",
  "Price",
  "Credit",
  "Not ready",
  "Duplicate",
  "Other",
] as const;

export const DEAD_REASON_CHIPS = [
  "Bad number",
  "Do not contact",
  "Duplicate",
  "No response",
  "Other",
] as const;

export function leadDisplayName(lead: {
  firstName: string;
  lastName: string;
}): string {
  return `${lead.firstName} ${lead.lastName}`.trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPhone(value?: string | null): string {
  if (!value) return "";
  const digits = digitsOnly(value);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value;
}

export function telHref(value?: string | null): string | null {
  if (!value) return null;
  const digits = digitsOnly(value);
  if (digits.length < 10) return null;
  return `tel:+1${digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits}`;
}

export const REBOOK_TASK_TITLE = "Call — rebook";
