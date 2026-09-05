import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuickAddForm } from "@/components/quick-add-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export default async function NewLeadPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <Button variant="ghost" size="icon" render={<Link href="/" />} aria-label="Back">
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Add lead</h1>
      </div>
      <QuickAddForm ownerName={user.name} />
    </div>
  );
}
