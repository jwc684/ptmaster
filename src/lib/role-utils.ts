import type { UserRole } from "@prisma/client";

const ROLE_PRIORITY: Record<UserRole, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  TRAINER: 2,
  MEMBER: 1,
};

const DASHBOARD_PATHS: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin",
  ADMIN: "/dashboard",
  TRAINER: "/dashboard",
  MEMBER: "/my",
};

/**
 * Check if user has at least one of the specified roles
 */
export function hasRole(
  userRoles: UserRole[],
  ...check: UserRole[]
): boolean {
  return userRoles.some((r) => check.includes(r));
}

/**
 * Get the highest-priority role from the user's roles
 */
export function primaryRole(userRoles: UserRole[]): UserRole {
  return userRoles.reduce((highest, role) =>
    ROLE_PRIORITY[role] > ROLE_PRIORITY[highest] ? role : highest
  , userRoles[0] ?? "MEMBER");
}

/**
 * Get dashboard redirect path based on user's roles (uses highest-priority role)
 */
export function getDashboardPath(userRoles: UserRole[]): string {
  const primary = primaryRole(userRoles);
  return DASHBOARD_PATHS[primary] ?? "/dashboard";
}
