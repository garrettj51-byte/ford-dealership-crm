import type { LeadStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/domain";
import { cn } from "@/lib/utils";

const STYLES: Record<LeadStatus, string> = {
  NEW: "bg-sky-100 text-sky-900 border-sky-200",
  WORKING: "bg-amber-100 text-amber-950 border-amber-200",
  APPT_SET: "bg-indigo-100 text-indigo-950 border-indigo-200",
  SOLD: "bg-emerald-100 text-emerald-950 border-emerald-200",
  LOST: "bg-rose-100 text-rose-950 border-rose-200",
  DEAD: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", STYLES[status], className)}
    >
      {statusLabel(status)}
    </Badge>
  );
}
