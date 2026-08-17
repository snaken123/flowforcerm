// Shared composite permission check: Admin, or Staff tagged as a Coach
// (Employee.employeeTypes, carried onto the session as session.user.employeeTypes).
export function isAdminOrCoach(session: { user?: any } | null): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  if (role === "ADMIN") return true;
  const employeeTypes: string[] = session.user.employeeTypes ?? [];
  return role === "STAFF" && employeeTypes.includes("COACH");
}

// A pure coach: tagged as an employee type but with neither "ADMIN" nor "STAFF"
// among those tags, mirroring the same check used to filter the sidebar's nav
// (components/layout/sidebar.tsx). Used to hide financial/administrative To Do
// sections (payments, receipts, sales, freeze requests) from coach-only accounts,
// who only need the achievement-approval queue.
export function isCoachOnly(session: { user?: any } | null): boolean {
  if (!session?.user) return false;
  const employeeTypes: string[] = session.user.employeeTypes ?? [];
  return employeeTypes.length > 0 && !employeeTypes.includes("ADMIN") && !employeeTypes.includes("STAFF");
}
