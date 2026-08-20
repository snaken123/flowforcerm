import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    legalAgreementAcceptance: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
  },
}));

vi.mock("@/control-plane/lib/db", () => ({
  controlPlanePrisma: {
    legalDocument: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email", () => ({
  sendLegalAgreementConfirmation: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/db";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logAudit } from "@/lib/audit";
import { sendLegalAgreementConfirmation } from "@/lib/email";
import { requiredTypesForRole, getRequiredAgreementStatus, acceptAgreements } from "@/lib/legal-agreements";

beforeEach(() => vi.clearAllMocks());

const TOS_DOC = { id: "doc-tos", type: "TERMS_OF_SERVICE", version: "1.0", title: "Terms of Service", content: "tos body", contentHash: "hash-tos" };
const PRIVACY_DOC = { id: "doc-priv", type: "PRIVACY_POLICY", version: "1.0", title: "Privacy Policy", content: "privacy body", contentHash: "hash-priv" };

describe("requiredTypesForRole", () => {
  it("ADMIN needs ToS, DPA, and Privacy Policy", () => {
    expect(requiredTypesForRole("ADMIN" as any)).toEqual(["TERMS_OF_SERVICE", "DATA_PROCESSING_AGREEMENT", "PRIVACY_POLICY"]);
  });

  it("STAFF needs Privacy Policy and AUP, not ToS/DPA", () => {
    expect(requiredTypesForRole("STAFF" as any)).toEqual(["PRIVACY_POLICY", "ACCEPTABLE_USE_POLICY"]);
  });

  it("MEMBER, KIOSK, and STORE need nothing", () => {
    expect(requiredTypesForRole("MEMBER" as any)).toEqual([]);
    expect(requiredTypesForRole("KIOSK" as any)).toEqual([]);
    expect(requiredTypesForRole("STORE" as any)).toEqual([]);
  });
});

describe("getRequiredAgreementStatus", () => {
  it("short-circuits with no control-plane query for a role with no required types", async () => {
    const result = await getRequiredAgreementStatus({ id: "u1", role: "MEMBER" as any });
    expect(result).toEqual({ outstanding: [], allAccepted: true });
    expect(controlPlanePrisma.legalDocument.findMany).not.toHaveBeenCalled();
  });

  it("checks org-scoped documents (ToS) against ANY acceptance, not this user's own", async () => {
    vi.mocked(controlPlanePrisma.legalDocument.findMany).mockResolvedValue([TOS_DOC] as any);
    vi.mocked(prisma.legalAgreementAcceptance.findFirst).mockResolvedValue({ id: "acc-1" } as any);

    const result = await getRequiredAgreementStatus({ id: "admin-2", role: "ADMIN" as any });

    expect(prisma.legalAgreementAcceptance.findFirst).toHaveBeenCalledWith({
      where: { documentType: "TERMS_OF_SERVICE", documentVersion: "1.0", scope: "ORGANIZATION" },
      select: { id: true },
    });
    expect(result.outstanding).toEqual([]);
    expect(result.allAccepted).toBe(true);
  });

  it("checks individual-scoped documents (Privacy Policy) against this user's own acceptance", async () => {
    vi.mocked(controlPlanePrisma.legalDocument.findMany).mockResolvedValue([PRIVACY_DOC] as any);
    vi.mocked(prisma.legalAgreementAcceptance.findFirst).mockResolvedValue(null);

    const result = await getRequiredAgreementStatus({ id: "staff-1", role: "STAFF" as any });

    expect(prisma.legalAgreementAcceptance.findFirst).toHaveBeenCalledWith({
      where: { userId: "staff-1", documentType: "PRIVACY_POLICY", documentVersion: "1.0" },
      select: { id: true },
    });
    expect(result.outstanding).toHaveLength(1);
    expect(result.outstanding[0]).toMatchObject({ documentId: "doc-priv", scope: "INDIVIDUAL" });
    expect(result.allAccepted).toBe(false);
  });

  it("a second admin is NOT re-gated on an org-scoped doc another admin already accepted", async () => {
    vi.mocked(controlPlanePrisma.legalDocument.findMany).mockResolvedValue([TOS_DOC, PRIVACY_DOC] as any);
    // Org-scoped ToS: someone (anyone) already accepted it -- found.
    // Individual-scoped Privacy Policy: THIS user hasn't -- not found.
    vi.mocked(prisma.legalAgreementAcceptance.findFirst)
      .mockResolvedValueOnce({ id: "acc-from-other-admin" } as any)
      .mockResolvedValueOnce(null);

    const result = await getRequiredAgreementStatus({ id: "admin-2", role: "ADMIN" as any });

    expect(result.outstanding.map((d) => d.type)).toEqual(["PRIVACY_POLICY"]);
  });
});

describe("acceptAgreements", () => {
  function setupOutstanding(docs: any[]) {
    vi.mocked(controlPlanePrisma.legalDocument.findMany).mockResolvedValue(docs as any);
    vi.mocked(prisma.legalAgreementAcceptance.findFirst).mockResolvedValue(null); // nothing accepted yet
    vi.mocked(prisma.legalAgreementAcceptance.findMany).mockResolvedValue([]); // no prior acceptance history
  }

  const user = { id: "staff-1", name: "Staff One", email: "staff@example.com", role: "STAFF" as any };

  it("ignores a documentId that isn't actually outstanding (anti-forgery)", async () => {
    setupOutstanding([PRIVACY_DOC]);

    const result = await acceptAgreements(user, ["some-forged-id"], { fallbackContext: "FIRST_LOGIN" });

    expect(result.accepted).toEqual([]);
    expect(prisma.legalAgreementAcceptance.create).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("creates one acceptance row per accepted document and logs audit per type", async () => {
    setupOutstanding([PRIVACY_DOC]);

    const result = await acceptAgreements(user, ["doc-priv"], { ip: "1.2.3.4", userAgent: "test-agent", fallbackContext: "FIRST_LOGIN" });

    expect(result.accepted).toHaveLength(1);
    expect(prisma.legalAgreementAcceptance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "staff-1",
        documentType: "PRIVACY_POLICY",
        documentVersion: "1.0",
        documentId: "doc-priv",
        scope: "INDIVIDUAL",
        ipAddress: "1.2.3.4",
        userAgent: "test-agent",
        context: "FIRST_LOGIN",
      }),
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PRIVACY_POLICY_ACKNOWLEDGED", userId: "staff-1" })
    );
  });

  it("derives UPDATED_TERMS context when this user already has a prior row of that document type", async () => {
    setupOutstanding([PRIVACY_DOC]);
    vi.mocked(prisma.legalAgreementAcceptance.findMany).mockResolvedValue([{ documentType: "PRIVACY_POLICY" }] as any);

    await acceptAgreements(user, ["doc-priv"], { fallbackContext: "FIRST_LOGIN" });

    expect(prisma.legalAgreementAcceptance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ context: "UPDATED_TERMS" }),
    });
  });

  it("sends a confirmation email when the user has an email, skips it otherwise", async () => {
    setupOutstanding([PRIVACY_DOC]);
    await acceptAgreements(user, ["doc-priv"], { fallbackContext: "FIRST_LOGIN" });
    expect(sendLegalAgreementConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ to: "staff@example.com" })
    );

    vi.clearAllMocks();
    setupOutstanding([PRIVACY_DOC]);
    await acceptAgreements({ ...user, email: null }, ["doc-priv"], { fallbackContext: "FIRST_LOGIN" });
    expect(sendLegalAgreementConfirmation).not.toHaveBeenCalled();
  });
});
