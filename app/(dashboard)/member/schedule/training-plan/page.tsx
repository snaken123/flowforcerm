import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrainingPlanBoard } from "@/components/training-plan/training-plan-board";

export const metadata = { title: "Training Plan" };

export default async function MemberTrainingPlanPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "MEMBER") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Training Plan</h1>
      <TrainingPlanBoard canEdit={false} />
    </div>
  );
}
