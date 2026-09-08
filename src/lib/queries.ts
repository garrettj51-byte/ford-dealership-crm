import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  OPEN_STATUSES,
  conversionRate,
  openLeadsCount,
  pipelineFromCounts,
  sortLeaderboard,
  type LeadStatusCounts,
} from "@/lib/dashboard";
import {
  endOfDayInTz,
  startOfDayInTz,
  startOfMonthInTz,
} from "@/lib/time";

export async function getTodayQueue(input: {
  ownerId?: string;
  status?: LeadStatus | "ALL";
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const end = endOfDayInTz(now);

  return prisma.task.findMany({
    where: {
      status: "OPEN",
      dueAt: { lte: end },
      ...(input.ownerId ? { ownerId: input.ownerId } : {}),
      ...(input.status && input.status !== "ALL"
        ? { lead: { status: input.status } }
        : {}),
    },
    include: {
      lead: { include: { owner: true } },
      owner: true,
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function searchLeads(query: string) {
  const q = query.trim();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  return prisma.lead.findMany({
    where: {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { vehicleInterest: { contains: q } },
        ...(tokens.length >= 2
          ? [
              {
                AND: [
                  { firstName: { contains: tokens[0] } },
                  { lastName: { contains: tokens.slice(1).join(" ") } },
                ],
              },
            ]
          : []),
      ],
    },
    include: {
      owner: true,
      tasks: {
        where: { status: "OPEN" },
        orderBy: { dueAt: "asc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
}

export async function getLeadDetail(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      owner: true,
      tasks: { orderBy: { createdAt: "desc" } },
      activities: {
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 80,
      },
      appointments: { orderBy: { scheduledAt: "desc" } },
      testDrives: { orderBy: { occurredAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export function startOfToday() {
  return startOfDayInTz(new Date());
}

export async function getDashboardData(now = new Date()) {
  const startToday = startOfDayInTz(now);
  const endToday = endOfDayInTz(now);
  const startMonth = startOfMonthInTz(now);

  const [
    statusGroups,
    overdueTasks,
    dueTodayTasks,
    newLeadsToday,
    appointmentsToday,
    soldActivitiesThisMonth,
    salespeople,
    openLeadsByOwner,
    openTasksByOwner,
    recentActivities,
  ] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.count({
      where: { status: "OPEN", dueAt: { lt: startToday } },
    }),
    prisma.task.count({
      where: { status: "OPEN", dueAt: { gte: startToday, lte: endToday } },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: startToday, lte: endToday } },
    }),
    prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: startToday, lte: endToday },
      },
      include: { lead: { include: { owner: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.activity.findMany({
      where: {
        type: "STATUS_CHANGE",
        createdAt: { gte: startMonth },
        metadata: { contains: '"to":"SOLD"' },
      },
      select: { actorId: true },
    }),
    prisma.salesperson.findMany({ orderBy: { name: "asc" } }),
    prisma.lead.groupBy({
      by: ["ownerId"],
      where: { status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["ownerId"],
      where: { status: "OPEN" },
      _count: { _all: true },
    }),
    prisma.activity.findMany({
      include: { actor: true, lead: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const counts: LeadStatusCounts = {};
  for (const group of statusGroups) {
    counts[group.status] = group._count._all;
  }

  const openLeadsMap = new Map(
    openLeadsByOwner.map((row) => [row.ownerId, row._count._all]),
  );
  const openTasksMap = new Map(
    openTasksByOwner.map((row) => [row.ownerId, row._count._all]),
  );
  const soldByActor = new Map<string, number>();
  for (const activity of soldActivitiesThisMonth) {
    soldByActor.set(
      activity.actorId,
      (soldByActor.get(activity.actorId) ?? 0) + 1,
    );
  }

  const leaderboard = sortLeaderboard(
    salespeople.map((person) => ({
      id: person.id,
      name: person.name,
      openLeads: openLeadsMap.get(person.id) ?? 0,
      openTasks: openTasksMap.get(person.id) ?? 0,
      soldThisMonth: soldByActor.get(person.id) ?? 0,
    })),
  );

  return {
    now,
    pipeline: pipelineFromCounts(counts),
    openLeads: openLeadsCount(counts),
    overdueTasks,
    dueTodayTasks,
    newLeadsToday,
    soldThisMonth: soldActivitiesThisMonth.length,
    conversionRate: conversionRate(
      counts.SOLD ?? 0,
      counts.LOST ?? 0,
      counts.DEAD ?? 0,
    ),
    appointmentsToday,
    leaderboard,
    recentActivities,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
