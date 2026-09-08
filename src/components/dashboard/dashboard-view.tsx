import Link from "next/link";
import {
  AlarmClock,
  ArrowRightLeft,
  CalendarClock,
  Car,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  CircleDot,
  CircleX,
  ListPlus,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { leadDisplayName } from "@/lib/domain";
import type { DashboardData } from "@/lib/queries";
import { formatClock, formatMonthYear } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ActivityType, LeadStatus } from "@prisma/client";

const PIPELINE_BAR: Record<LeadStatus, string> = {
  NEW: "bg-sky-500",
  WORKING: "bg-amber-500",
  APPT_SET: "bg-indigo-500",
  SOLD: "bg-emerald-500",
  LOST: "bg-rose-500",
  DEAD: "bg-zinc-400",
};

export function DashboardView({
  data,
  currentUserId,
}: {
  data: DashboardData;
  currentUserId: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-16">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Floor overview · {formatMonthYear(data.now)}
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-[var(--ford-navy)] hover:underline"
        >
          Today →
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="size-5" />}
          label="Open leads"
          value={data.openLeads}
          tint="text-sky-600"
          href="/?scope=all"
        />
        <StatCard
          icon={<CalendarClock className="size-5" />}
          label="Appts today"
          value={data.appointmentsToday.length}
          tint="text-indigo-600"
        />
        <StatCard
          icon={<AlarmClock className="size-5" />}
          label="Overdue tasks"
          value={data.overdueTasks}
          tint={data.overdueTasks > 0 ? "text-rose-600" : "text-muted-foreground"}
          href="/?scope=all"
        />
        <StatCard
          icon={<CircleDollarSign className="size-5" />}
          label="Sold this month"
          value={data.soldThisMonth}
          tint="text-emerald-600"
        />
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Pipeline</h2>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" />
            {data.conversionRate}% win rate
          </span>
        </div>
        <PipelineBars pipeline={data.pipeline} />
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Today’s appointments</h2>
          <span className="text-xs text-muted-foreground">
            {data.appointmentsToday.length}
          </span>
        </div>
        {data.appointmentsToday.length === 0 ? (
          <EmptyLine text="No appointments scheduled for today." />
        ) : (
          <ul className="divide-y divide-border">
            {data.appointmentsToday.map((appt) => (
              <li key={appt.id}>
                <Link
                  href={`/leads/${appt.leadId}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-muted/40"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatClock(appt.scheduledAt)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {leadDisplayName(appt.lead)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {appt.lead.vehicleInterest || "No vehicle noted"} ·{" "}
                      {appt.lead.owner.id === currentUserId
                        ? "You"
                        : appt.lead.owner.name}
                    </div>
                  </div>
                  <StatusBadge status={appt.lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Leaderboard</h2>
        </div>
        <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] items-center gap-x-3 gap-y-1 text-xs">
          <span />
          <span className="text-muted-foreground">Salesperson</span>
          <HeaderCell label="Sold" />
          <HeaderCell label="Open" />
          <HeaderCell label="Tasks" />
          {data.leaderboard.map((row, index) => (
            <LeaderboardRowView
              key={row.id}
              rank={index + 1}
              row={row}
              isCurrentUser={row.id === currentUserId}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
        {data.recentActivities.length === 0 ? (
          <EmptyLine text="No activity yet." />
        ) : (
          <ul className="space-y-3">
            {data.recentActivities.map((activity) => (
              <li key={activity.id}>
                <Link
                  href={`/leads/${activity.leadId}`}
                  className="group flex items-start gap-3"
                >
                  <ActivityIcon type={activity.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">
                        {leadDisplayName(activity.lead)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {activity.body}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.actor.name} · {formatClock(activity.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: string;
  href?: string;
}) {
  const inner = (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className={cn("flex items-center justify-between", tint)}>
        {icon}
      </div>
      <div>
        <div className="text-3xl font-semibold tabular-nums leading-none">
          {value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-colors hover:brightness-[0.98]">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function PipelineBars({ pipeline }: { pipeline: DashboardData["pipeline"] }) {
  const max = Math.max(1, ...pipeline.map((entry) => entry.count));
  return (
    <div className="space-y-2">
      {pipeline.map((entry) => (
        <div key={entry.status} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-muted-foreground">
            {entry.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
            <div
              className={cn("h-full rounded", PIPELINE_BAR[entry.status])}
              style={{
                width: entry.count > 0 ? `${(entry.count / max) * 100}%` : "0%",
                minWidth: entry.count > 0 ? "0.5rem" : undefined,
              }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums">
            {entry.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function HeaderCell({ label }: { label: string }) {
  return <span className="w-9 text-right text-muted-foreground">{label}</span>;
}

function LeaderboardRowView({
  rank,
  row,
  isCurrentUser,
}: {
  rank: number;
  row: DashboardData["leaderboard"][number];
  isCurrentUser: boolean;
}) {
  return (
    <>
      <span className="text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <span className="truncate text-sm font-medium">
        {row.name}
        {isCurrentUser ? (
          <span className="ml-1 text-xs text-muted-foreground">(You)</span>
        ) : null}
      </span>
      <span className="w-9 text-right text-sm font-semibold tabular-nums text-emerald-600">
        {row.soldThisMonth}
      </span>
      <span className="w-9 text-right text-sm tabular-nums">{row.openLeads}</span>
      <span className="w-9 text-right text-sm tabular-nums text-muted-foreground">
        {row.openTasks}
      </span>
    </>
  );
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const { icon, tint } = ACTIVITY_STYLE[type];
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full",
        tint,
      )}
    >
      {icon}
    </span>
  );
}

const ACTIVITY_STYLE: Record<
  ActivityType,
  { icon: React.ReactNode; tint: string }
> = {
  LEAD_CREATED: {
    icon: <UserPlus className="size-3.5" />,
    tint: "bg-sky-100 text-sky-700",
  },
  NOTE: {
    icon: <StickyNote className="size-3.5" />,
    tint: "bg-zinc-100 text-zinc-600",
  },
  CALL: {
    icon: <Phone className="size-3.5" />,
    tint: "bg-blue-100 text-blue-700",
  },
  SMS: {
    icon: <MessageSquare className="size-3.5" />,
    tint: "bg-violet-100 text-violet-700",
  },
  EMAIL: {
    icon: <Mail className="size-3.5" />,
    tint: "bg-cyan-100 text-cyan-700",
  },
  STATUS_CHANGE: {
    icon: <ArrowRightLeft className="size-3.5" />,
    tint: "bg-amber-100 text-amber-700",
  },
  OWNER_CHANGE: {
    icon: <Users className="size-3.5" />,
    tint: "bg-purple-100 text-purple-700",
  },
  TASK_CREATED: {
    icon: <ListPlus className="size-3.5" />,
    tint: "bg-zinc-100 text-zinc-600",
  },
  TASK_COMPLETED: {
    icon: <CircleCheck className="size-3.5" />,
    tint: "bg-emerald-100 text-emerald-700",
  },
  TASK_CANCELLED: {
    icon: <CircleX className="size-3.5" />,
    tint: "bg-rose-100 text-rose-700",
  },
  APPOINTMENT: {
    icon: <CalendarClock className="size-3.5" />,
    tint: "bg-indigo-100 text-indigo-700",
  },
  TEST_DRIVE: {
    icon: <Car className="size-3.5" />,
    tint: "bg-teal-100 text-teal-700",
  },
};

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
      <CircleDot className="size-4" />
      {text}
    </p>
  );
}
