import type { LeadStatus } from "@prisma/client";
import { statusLabel } from "@/lib/domain";

/** Status order used for the pipeline funnel, left to right. */
export const PIPELINE_ORDER: LeadStatus[] = [
  "NEW",
  "WORKING",
  "APPT_SET",
  "SOLD",
  "LOST",
  "DEAD",
];

/** Statuses that count as an active, in-progress lead. */
export const OPEN_STATUSES: LeadStatus[] = ["NEW", "WORKING", "APPT_SET"];

export type StatusCount = {
  status: LeadStatus;
  label: string;
  count: number;
};

export type LeaderboardRow = {
  id: string;
  name: string;
  openLeads: number;
  openTasks: number;
  soldThisMonth: number;
};

export type LeadStatusCounts = Partial<Record<LeadStatus, number>>;

/** Build the ordered pipeline breakdown from a status → count map. */
export function pipelineFromCounts(counts: LeadStatusCounts): StatusCount[] {
  return PIPELINE_ORDER.map((status) => ({
    status,
    label: statusLabel(status),
    count: counts[status] ?? 0,
  }));
}

/** Total leads that are still in play (new, working, or appointment set). */
export function openLeadsCount(counts: LeadStatusCounts): number {
  return OPEN_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
}

/**
 * Win rate over closed deals: sold / (sold + lost + dead), as a whole
 * percentage. Returns 0 when nothing has closed yet.
 */
export function conversionRate(
  sold: number,
  lost: number,
  dead: number,
): number {
  const closed = sold + lost + dead;
  if (closed <= 0) return 0;
  return Math.round((sold / closed) * 100);
}

/** Order the leaderboard: most sold first, then most open leads. */
export function sortLeaderboard(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort(
    (a, b) =>
      b.soldThisMonth - a.soldThisMonth ||
      b.openLeads - a.openLeads ||
      a.name.localeCompare(b.name),
  );
}
