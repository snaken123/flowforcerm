import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    privacyRequest: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PATCH } from "@/app/api/privacy-requests/[id]/route";

function makeRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost/api/privacy-requests/req1"), {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/privacy-requests/[id]", () => {
  it("returns 403 when the caller is not ADMIN", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "staff-1", role: "STAFF" } } as any);
    const res = await PATCH(makeRequest({ action: "complete" }), { params: { id: "req1" } });
    expect(res.status).toBe(403);
    expect(prisma.privacyRequest.updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the request doesn't exist", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.privacyRequest.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeRequest({ action: "complete" }), { params: { id: "req1" } });
    expect(res.status).toBe(404);
  });

  it("returns 409 up front when the request is already reviewed", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.privacyRequest.findUnique).mockResolvedValue({ id: "req1", status: "APPROVED", type: "DELETION" } as any);
    const res = await PATCH(makeRequest({ action: "complete" }), { params: { id: "req1" } });
    expect(res.status).toBe(409);
    expect(prisma.privacyRequest.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when the atomic claim loses the race (concurrent review already claimed it)", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.privacyRequest.findUnique).mockResolvedValue({ id: "req1", status: "PENDING", type: "DELETION" } as any);
    // Passed the upfront check as PENDING, but by the time updateMany runs, someone else already claimed it.
    vi.mocked(prisma.privacyRequest.updateMany).mockResolvedValue({ count: 0 } as any);
    const res = await PATCH(makeRequest({ action: "complete" }), { params: { id: "req1" } });
    expect(res.status).toBe(409);
    expect(prisma.privacyRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "req1", status: "PENDING" },
      data: expect.objectContaining({ status: "APPROVED" }),
    });
  });

  it("completes a request and logs PRIVACY_REQUEST_COMPLETED", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", name: "Admin One" } } as any);
    vi.mocked(prisma.privacyRequest.findUnique).mockResolvedValue({ id: "req1", status: "PENDING", type: "DELETION" } as any);
    vi.mocked(prisma.privacyRequest.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.privacyRequest.findUniqueOrThrow).mockResolvedValue({ id: "req1", status: "APPROVED" } as any);

    const res = await PATCH(makeRequest({ action: "complete", resolutionNotes: "handled" }), { params: { id: "req1" } });

    expect(res.status).toBe(200);
    expect(prisma.privacyRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "req1", status: "PENDING" },
      data: expect.objectContaining({ status: "APPROVED", reviewedById: "admin-1", resolutionNotes: "handled" }),
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PRIVACY_REQUEST_COMPLETED" }));
  });

  it("rejects a request and logs PRIVACY_REQUEST_REJECTED", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.privacyRequest.findUnique).mockResolvedValue({ id: "req1", status: "PENDING", type: "ACCESS" } as any);
    vi.mocked(prisma.privacyRequest.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.privacyRequest.findUniqueOrThrow).mockResolvedValue({ id: "req1", status: "REJECTED" } as any);

    const res = await PATCH(makeRequest({ action: "reject" }), { params: { id: "req1" } });

    expect(res.status).toBe(200);
    expect(prisma.privacyRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED" }) })
    );
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PRIVACY_REQUEST_REJECTED" }));
  });
});
