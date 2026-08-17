// The three optional feature bundles a gym can be given access to via the superadmin
// flags matrix -- everything else (members, schedule, records, reports, employees,
// settings) is core and always on. Split into their own file (no next/headers import)
// so client components like the sidebar can reference the keys without dragging
// server-only code into the client bundle -- see lib/feature-flags.ts for the actual
// isFeatureEnabled()/requireFeature() checks.
export const FLAG_COMMUNICATIONS = "communications";
export const FLAG_SPECIALIZED_ROLES = "specialized_roles";
export const FLAG_WEB_INTEGRATION = "web_integration";
