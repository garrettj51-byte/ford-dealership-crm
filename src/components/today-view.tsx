import Link from "next/link";
import { Plus } from "lucide-react";
import { LeadRow } from "@/components/lead-row";
import { STATUS_FILTERS } from "@/lib/domain";
import { isOverdue } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@prisma/client";

type QueueItem = {
  id: string;
  title: string;
  type: "CALL" | "TEXT" | "EMAIL" | "APPOINTMENT" | "FOLLOW_UP" | "OTHER";
  dueAt: Date;
  ownerId: string;
  owner: { id: string; name: string };
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    vehicleInterest: string | null;
    status: LeadStatus;
    ownerId: string;
    owner: { id: string; name: string };
  };
};

export function TodayView({
  items,
  currentUserId,
  scope,
  status,
}: {
  items: QueueItem[];
  currentUserId: string;
  scope: "mine" | "all";
  status: LeadStatus | "ALL";
}) {
  const overdue = items.filter((item) => isOverdue(item.dueAt));
  const today = items.filter((item) => !isOverdue(item.dueAt));

  return (
    <div className="relative flex flex-1 flex-col pb-24">
      <div className="sticky top-[4.75rem] z-30 space-y-3 border-b border-border bg-[var(--app-bg)] px-4 py-3">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
            <p className="text-sm text-muted-foreground">
              {scope === "mine" ? "Your open tasks" : "Everyone’s open tasks"}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
            <ScopeLink active={scope === "mine"} href={href("mine", status)}>
              Mine
            </ScopeLink>
            <ScopeLink active={scope === "all"} href={href("all", status)}>
              All
            </ScopeLink>
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {STATUS_FILTERS.map((filter) => {
            const active = status === filter.value;
            return (
              <Link
                key={filter.value}
                href={href(scope, filter.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-sm font-medium",
                  active
                    ? "bg-[var(--ford-navy)] text-white"
                    : "bg-white text-foreground ring-1 ring-border",
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-6 px-4 py-4">
        {items.length === 0 ? (
          <EmptyState scope={scope} />
        ) : (
          <>
            {overdue.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold tracking-wider text-rose-700 uppercase">
                  Overdue · {overdue.length}
                </h2>
                {overdue.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    currentUserId={currentUserId}
                  />
                ))}
              </section>
            ) : null}
            {today.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Due today · {today.length}
                </h2>
                {today.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    currentUserId={currentUserId}
                  />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>

      <Link
        href="/leads/new"
        className="fixed right-5 bottom-6 z-40 inline-flex size-14 items-center justify-center rounded-full bg-[var(--ford-navy)] text-white shadow-lg shadow-black/20 hover:bg-[#00285c]"
        aria-label="Add lead"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}

function QueueRow({
  item,
  currentUserId,
}: {
  item: QueueItem;
  currentUserId: string;
}) {
  return (
    <LeadRow
      href={`/leads/${item.lead.id}`}
      firstName={item.lead.firstName}
      lastName={item.lead.lastName}
      vehicleInterest={item.lead.vehicleInterest}
      status={item.lead.status}
      ownerName={item.lead.owner.name}
      currentUserId={currentUserId}
      ownerId={item.lead.ownerId}
      taskTitle={item.title}
      taskType={item.type}
      dueAt={item.dueAt}
      phone={item.lead.phone}
    />
  );
}

function ScopeLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1 font-medium",
        active ? "bg-[var(--ford-navy)] text-white" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function EmptyState({ scope }: { scope: "mine" | "all" }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center">
      <p className="font-medium">You’re clear</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {scope === "mine"
          ? "No overdue or due-today tasks on your list."
          : "No open tasks due today for the floor."}
      </p>
      <Link
        href="/leads/new"
        className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--ford-navy)] px-4 text-sm font-medium text-white"
      >
        Add a lead
      </Link>
    </div>
  );
}

function href(scope: "mine" | "all", status: LeadStatus | "ALL") {
  const params = new URLSearchParams();
  if (scope === "all") params.set("scope", "all");
  if (status !== "ALL") params.set("status", status);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
