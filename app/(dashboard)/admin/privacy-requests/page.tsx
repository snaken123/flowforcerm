import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrivacyRequestsClient } from "./privacy-requests-client";

export const metadata = { title: "Privacy Requests" };

export default async function PrivacyRequestsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const requests = await prisma.privacyRequest.findMany({
    include: {
      requestedBy: { select: { role: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Privacy Requests</h1>
        <p className="text-muted-foreground mt-1">
          Data-subject requests (access, correction, deletion, objection, portability) submitted by members, staff, and admins.
        </p>
      </div>
      <PrivacyRequestsClient initialRequests={requests as any} />
    </div>
  );
}
