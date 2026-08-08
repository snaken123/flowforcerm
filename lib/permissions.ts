// Shared composite permission check: Admin, or Staff tagged as a Coach
// (Employee.employeeTypes, carried onto the session as session.user.employeeTypes).
export function isAdminOrCoach(session: { user?: any } | null): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  if (role === "ADMIN") return true;
  const employeeTypes: string[] = session.user.employeeTypes ?? [];
  return role === "STAFF" && employeeTypes.includes("COACH");
}
