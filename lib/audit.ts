import { prisma } from "@/lib/db";

export async function logAudit({
  userId,
  userName,
  action,
  entityType,
  entityId,
  entityName,
  description,
  metadata,
}: {
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: { userId, userName, action, entityType, entityId, entityName, description, metadata },
    });
  } catch (e) {
    console.error("[audit] Failed to write audit log:", e);
  }
}
