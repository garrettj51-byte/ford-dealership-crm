import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";

export default async function DashboardPage() {
  const [user, data] = await Promise.all([
    getCurrentUser(),
    getDashboardData(),
  ]);

  return <DashboardView data={data} currentUserId={user.id} />;
}
