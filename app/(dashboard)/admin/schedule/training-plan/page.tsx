import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canEditTrainingPlan } from "@/lib/training-plan";
import { TrainingPlanBoard } from "@/components/training-plan/training-plan-board";

export const metadata = { title: "Training Plan" };

export default async function TrainingPlanPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Training Plan</h1>
      <TrainingPlanBoard canEdit={canEditTrainingPlan(session)} />
    </div>
  );
}
