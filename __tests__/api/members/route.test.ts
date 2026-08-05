import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    member: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { GET, POST } from "@/app/api/members/route";

function makeRequest(method: string, body?: unknown, searchParams?: Record<string, string>) {
  const url = new URL("http://localhost/api/members");
  if (searchParams) Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : {},
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/members", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("returns members list for authenticated user", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as any);
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      { id: "m1", firstName: "John", lastName: "Doe" } as any,
    ]);
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].firstName).toBe("John");
  });

  it("filters by status query param", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as any);
    vi.mocked(prisma.member.findMany).mockResolvedValue([]);
    await GET(makeRequest("GET", undefined, { status: "ACTIVE" }));
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "ACTIVE" }) })
    );
  });
});

describe("POST /api/members", () => {
  const validBody = { firstName: "Jane", lastName: "Smith", email: "jane@example.com" };

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", validBody));
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is MEMBER", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "MEMBER" } } as any);
    const res = await POST(makeRequest("POST", validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as any);
    const res = await POST(makeRequest("POST", { email: "test@example.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as any);
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "existing" } as any);
    const res = await POST(makeRequest("POST", validBody));
    expect(res.status).toBe(409);
  });

  it("creates member with user account when email provided", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } } as any);
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const mockMember = { id: "m1", firstName: "Jane", lastName: "Smith", memberNumber: "NS-00001" };
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "u2", member: mockMember } as any);
    vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as any);

    const res = await POST(makeRequest("POST", validBody));
    expect(res.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("creates guest member (no user account) when email omitted", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: { id: "u1", role: "STAFF", name: "Staff" } } as any);
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    const mockMember = { id: "m2", firstName: "Guest", lastName: "User", memberNumber: "NS-00002" };
    vi.mocked(prisma.member.create).mockResolvedValue(mockMember as any);

    const res = await POST(makeRequest("POST", { firstName: "Guest", lastName: "User", status: "INACTIVE" }));
    expect(res.status).toBe(201);
    expect(prisma.member.create).toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
