import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { endOfDayInTz, startOfDayInTz } from "@/lib/time";

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
