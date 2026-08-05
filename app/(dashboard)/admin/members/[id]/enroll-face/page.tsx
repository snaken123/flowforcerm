import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ScanFace } from "lucide-react";

const FaceEnroll = dynamic(
  () => import("@/components/face-recognition/FaceEnroll").then((m) => m.FaceEnroll),
  { ssr: false }
);

export default async function EnrollFacePage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: { id: true, firstName: true, lastName: true, faceDescriptor: true },
  });

  if (!member) notFound();

  const hasExisting = member.faceDescriptor.length === 128;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/members/${params.id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanFace className="w-6 h-6" />
            Face Enrollment
          </h1>
          <p className="text-muted-foreground text-sm">
            {member.firstName} {member.lastName}
          </p>
        </div>
      </div>

      {hasExisting && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Face data already enrolled — re-capture to update
        </div>
      )}

      <div className="bg-card border rounded-xl p-6">
        <FaceEnroll
          memberId={member.id}
          memberName={`${member.firstName} ${member.lastName}`}
          hasExisting={hasExisting}
        />
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium">Tips for good enrollment:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Good lighting facing the camera</li>
          <li>Look directly at the camera, neutral expression</li>
          <li>Remove glasses if possible</li>
          <li>Keep the camera at eye level</li>
        </ul>
      </div>
    </div>
  );
}
