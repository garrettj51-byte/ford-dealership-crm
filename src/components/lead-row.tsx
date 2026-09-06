import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatPhone, leadDisplayName, taskTypeLabel } from "@/lib/domain";
import { formatRelativeDue, isOverdue } from "@/lib/time";
import type { LeadStatus } from "@prisma/client";

export function LeadRow({
  href,
  firstName,
  lastName,
  vehicleInterest,
  status,
  ownerName,
  currentUserId,
  ownerId,
  taskTitle,
  taskType,
  dueAt,
  phone,
}: {
  href: string;
  firstName: string;
  lastName: string;
  vehicleInterest?: string | null;
  status: LeadStatus;
  ownerName: string;
  currentUserId: string;
  ownerId: string;
  taskTitle?: string | null;
  taskType?: "CALL" | "TEXT" | "EMAIL" | "APPOINTMENT" | "FOLLOW_UP" | "OTHER" | null;
  dueAt?: Date | string | null;
  phone?: string | null;
}) {
  const due = dueAt ? new Date(dueAt) : null;
  const overdue = due ? isOverdue(due) : false;

  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">
            {leadDisplayName({ firstName, lastName })}
          </div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {vehicleInterest || formatPhone(phone) || "No vehicle noted"}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {due && taskTitle ? (
          <span className={overdue ? "font-medium text-rose-700" : "text-foreground"}>
            {taskType ? `${taskTypeLabel(taskType)} · ` : ""}
            {formatRelativeDue(due)}
          </span>
        ) : (
          <span className="text-muted-foreground">No next touch</span>
        )}
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          {ownerId === currentUserId ? "You" : ownerName}
        </span>
      </div>
    </Link>
  );
}
