import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdminOrCoach } from "@/lib/permissions";
import { RecordsTodoClient } from "./records-todo-client";

export const metadata = { title: "To Do" };

export default async function RecordsTodoPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (!isAdminOrCoach(session)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">To Do</h1>
        <p className="text-muted-foreground mt-1">Records submitted by members, pending your approval.</p>
      </div>
      <RecordsTodoClient />
    </div>
  );
}
