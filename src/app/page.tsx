import { TodayView } from "@/components/today-view";
import { getCurrentUser } from "@/lib/auth";
import { getTodayQueue } from "@/lib/queries";
import type { LeadStatus } from "@prisma/client";

const STATUSES: LeadStatus[] = [
  "NEW",
  "WORKING",
  "APPT_SET",
  "SOLD",
  "LOST",
  "DEAD",
];

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const scope = params.scope === "all" ? "all" : "mine";
  const status = STATUSES.includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : "ALL";

  const items = await getTodayQueue({
    ownerId: scope === "mine" ? user.id : undefined,
    status,
  });

  return (
    <TodayView
      items={items}
      currentUserId={user.id}
      scope={scope}
      status={status}
    />
  );
}
