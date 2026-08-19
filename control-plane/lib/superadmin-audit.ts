import { controlPlanePrisma } from "@/control-plane/lib/db";

// Mirrors lib/audit.ts's logAudit() for control-plane/superadmin actions. Control-
// plane has no general audit log otherwise (ProvisioningLog is provisioning-
// specific) -- used for legal-document publish/supersede/archive actions.
export async function logSuperAdminAudit({
  superAdminId,
  action,
  entityType,
  entityId,
  description,
  metadata,
}: {
  superAdminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  try {
    await controlPlanePrisma.superAdminAuditLog.create({
      data: { superAdminId, action, entityType, entityId, description, metadata },
    });
  } catch (e) {
    console.error("[superadmin-audit] Failed to write audit log:", e);
  }
}
