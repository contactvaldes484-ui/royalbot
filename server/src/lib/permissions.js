/**
 * Centralized RBAC + plan permissions.
 * Read-only at runtime — plan tiers are loaded from DB via SubscriptionPlan,
 * but role hierarchy is fixed.
 */

// RBAC role hierarchy (higher = more access)
const ROLE_HIERARCHY = {
  user: 0,
  premium: 1,
  vip: 2,
  admin: 10,
  super_admin: 20,
};

// Default tier mapping if plan not found in DB (fallback hierarchy)
const FALLBACK_PLAN_TIER = {
  free: 0,
  starter: 1,
  pro: 2,
  premium: 2,        // legacy alias
  vip: 3,
  institutional: 4,
};

const ROLES = Object.keys(ROLE_HIERARCHY);
const PLANS_DEFAULT = Object.keys(FALLBACK_PLAN_TIER);

/**
 * Get numeric tier of user's role.
 */
function roleLevel(role) {
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Check if a role has at least the required role level.
 */
function hasRole(userRole, requiredRole) {
  return roleLevel(userRole) >= roleLevel(requiredRole);
}

/**
 * Check if the user is an admin (admin or super_admin).
 */
function isAdmin(userRole) {
  return roleLevel(userRole) >= ROLE_HIERARCHY.admin;
}

module.exports = {
  ROLE_HIERARCHY,
  FALLBACK_PLAN_TIER,
  ROLES,
  PLANS_DEFAULT,
  roleLevel,
  hasRole,
  isAdmin,
};
