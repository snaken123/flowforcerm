const VERCEL_API_BASE = "https://api.vercel.com";

async function vercelFetch(path: string, init?: RequestInit) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not set");

  const url = new URL(`${VERCEL_API_BASE}${path}`);
  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }

  // DELETE returns 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

function projectId(): string {
  const id = process.env.VERCEL_PROJECT_ID;
  if (!id) throw new Error("VERCEL_PROJECT_ID is not set");
  return id;
}

export type VercelDomainStatus = { name: string; verified: boolean };

function tenantHostname(subdomain: string): string {
  return `${subdomain}.flowforcerm.com`;
}

// Registers a tenant's subdomain on this Vercel project. flowforcerm.com itself is
// already a verified domain on this project, so a subdomain of it normally verifies
// (and gets its TLS cert issued) within seconds with no extra DNS work needed -- the
// wildcard CNAME already in place already routes traffic here, it just needs Vercel to
// recognize the hostname. Safe to call again for a domain that's already added:
// Vercel returns 409 in that case, which is treated as success.
export async function addTenantDomain(subdomain: string): Promise<VercelDomainStatus> {
  const name = tenantHostname(subdomain);
  try {
    const data = await vercelFetch(`/v10/projects/${projectId()}/domains`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return { name: data.name, verified: !!data.verified };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("(409)") || message.includes("domain_already_in_use")) {
      return getTenantDomainStatus(subdomain);
    }
    throw err;
  }
}

export async function getTenantDomainStatus(subdomain: string): Promise<VercelDomainStatus> {
  const name = tenantHostname(subdomain);
  const data = await vercelFetch(`/v9/projects/${projectId()}/domains/${name}`);
  return { name: data.name, verified: !!data.verified };
}

export async function removeTenantDomain(subdomain: string): Promise<void> {
  const name = tenantHostname(subdomain);
  await vercelFetch(`/v9/projects/${projectId()}/domains/${name}`, { method: "DELETE" });
}

// Polls briefly for verification. Usually near-instant since the parent domain is
// already verified on this project, but cert issuance can lag a couple seconds.
async function waitForDomainVerification(subdomain: string, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getTenantDomainStatus(subdomain);
    if (status.verified) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// Adds the domain (idempotently) and waits briefly to confirm it went live. Used both
// during initial provisioning and as a standalone retry action if that step failed or
// was never run for an older tenant.
export async function ensureTenantDomain(subdomain: string): Promise<boolean> {
  await addTenantDomain(subdomain);
  return waitForDomainVerification(subdomain);
}
