const NEON_API_BASE = "https://console.neon.tech/api/v2";

async function neonFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) throw new Error("NEON_API_KEY is not set");

  const res = await fetch(`${NEON_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Neon API ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }

  return res.json();
}

export type ProvisionedNeonProject = {
  neonProjectId: string;
  databaseUrl: string; // pooled — used for the app's runtime queries
  directUrl: string; // unpooled — used for the schema bootstrap and Prisma migrations
};

// Creates a fresh Neon project for a new tenant. The default branch/database/role that
// Neon creates automatically (neondb / neondb_owner) is used as-is — one project per
// tenant is the isolation boundary, not a sub-division within a shared project.
export async function createTenantNeonProject(name: string): Promise<ProvisionedNeonProject> {
  const orgId = process.env.NEON_ORG_ID;
  if (!orgId) throw new Error("NEON_ORG_ID is not set");

  const data = await neonFetch("/projects", {
    method: "POST",
    body: JSON.stringify({
      project: { name, region_id: "aws-ap-southeast-1", org_id: orgId },
    }),
  });

  const uri = data.connection_uris?.[0];
  if (!uri) throw new Error("Neon project created but no connection URI was returned");

  const { role, password, database, host, pooler_host } = uri.connection_parameters;
  const databaseUrl = `postgresql://${role}:${password}@${pooler_host}/${database}?sslmode=require`;
  const directUrl = `postgresql://${role}:${password}@${host}/${database}?sslmode=require`;

  return { neonProjectId: data.project.id, databaseUrl, directUrl };
}

// Best-effort cleanup for a project that failed provisioning partway through —
// callers should not let a delete failure here mask the original error.
export async function deleteTenantNeonProject(neonProjectId: string): Promise<void> {
  await neonFetch(`/projects/${neonProjectId}`, { method: "DELETE" });
}
