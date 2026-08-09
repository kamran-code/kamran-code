import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, dashboardEnabled, verifyCookie } from "@/lib/auth";
import { getStats } from "@/lib/store";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!dashboardEnabled()) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <h1 className="text-lg font-bold">Dashboard not configured</h1>
        <p className="mt-1 text-sm">
          Set <code>DASHBOARD_PASSWORD</code> in the server environment and restart
          the app to enable the admin dashboard.
        </p>
      </div>
    );
  }

  const cookieStore = await cookies();
  if (!verifyCookie(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/dashboard/login");
  }

  const stats = await getStats();
  return <DashboardClient initialStats={stats} />;
}
