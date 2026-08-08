import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdminOrCoach } from "@/lib/permissions";
import { RecordsTodoClient } from "./records-todo-client";
import { PendingReceiptsClient } from "./pending-receipts-client";

export const metadata = { title: "To Do" };

export default async function RecordsTodoPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">To Do</h1>
        <p className="text-muted-foreground mt-1">Items that need attention before they're complete.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Pending Receipts</h2>
        <p className="text-sm text-muted-foreground -mt-2">Payments flagged as needing a receipt, but none attached yet.</p>
        <PendingReceiptsClient />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Pending Records</h2>
        <p className="text-sm text-muted-foreground -mt-2">Achievements submitted by members, awaiting approval.</p>
        <RecordsTodoClient canApprove={isAdminOrCoach(session)} />
      </div>
    </div>
  );
}
