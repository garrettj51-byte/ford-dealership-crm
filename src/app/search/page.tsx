import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LeadRow } from "@/components/lead-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { searchLeads } from "@/lib/queries";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const user = await getCurrentUser();
  const results = q.trim() ? await searchLeads(q) : [];

  return (
    <div className="pb-8">
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <Button variant="ghost" size="icon" render={<Link href="/" />} aria-label="Back">
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Search</h1>
      </div>
      <form action="/search" className="px-4 py-4">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Name, phone, email, vehicle…"
          autoFocus
        />
      </form>
      <div className="space-y-2 px-4">
        {q.trim() && results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching leads.</p>
        ) : null}
        {results.map((lead) => {
          const task = lead.tasks[0];
          return (
            <LeadRow
              key={lead.id}
              href={`/leads/${lead.id}`}
              firstName={lead.firstName}
              lastName={lead.lastName}
              vehicleInterest={lead.vehicleInterest}
              status={lead.status}
              ownerName={lead.owner.name}
              currentUserId={user.id}
              ownerId={lead.ownerId}
              taskTitle={task?.title}
              taskType={task?.type}
              dueAt={task?.dueAt}
              phone={lead.phone}
            />
          );
        })}
      </div>
    </div>
  );
}
