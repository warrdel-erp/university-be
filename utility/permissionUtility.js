import { PERMISSIONS } from "../const/permissions.js";
import { SCOPES, scopeRank, SCOPE_ORDER } from "../const/scopes.js";

/**
 * A role of scope S may only hold permissions allowed at that scope.
 * - If roleScope is 'MY', it can ONLY hold permissions with 'MY' in possibleScopes.
 * - If roleScope is an organizational scope (UNIVERSITY, CAMPUS, INSTITUTE, DEPARTMENT):
 *   - Personal 'MY' permissions are ALWAYS visible/assignable across all scopes.
 *   - Organizational permissions are allowed if their lowest organizational scope is at or below roleScope.
 */
export function isPermissionAllowedForScope(permissionKey, roleScope) {
  const perm = PERMISSIONS[permissionKey];
  if (!perm) {
    throw new Error(`Unknown permission key: '${permissionKey}'`);
  }
  const possible = perm.possibleScopes;
  if (!Array.isArray(possible) || !possible.length) {
    throw new Error(`Permission '${permissionKey}' does not have any possibleScopes configured.`);
  }

  // When roleScope is 'MY', ONLY 'MY' permissions are allowed
  if (roleScope === SCOPES.MY) {
    return possible.includes(SCOPES.MY);
  }

  // Personal 'MY' permissions are always visible and assignable across all role scopes
  if (possible.includes(SCOPES.MY)) {
    return true;
  }

  const roleRank = scopeRank(roleScope);
  if (roleRank === -1) {
    throw new Error(`Invalid role scope: '${roleScope}'`);
  }

  return Math.min(...possible.map(scopeRank)) <= roleRank;
}

/**
 * Scope a permission actually runs at for a role:
 * - If the permission is a personal 'MY' permission, it runs at 'MY' scope regardless of the role.
 * - For organizational permissions, it runs at the role's scope if supported, or the widest scope below it.
 */
export function getEffectiveScope(permissionKey, roleScope) {
  const perm = PERMISSIONS[permissionKey];
  if (!perm) {
    throw new Error(`Unknown permission key: '${permissionKey}'`);
  }
  const possible = perm.possibleScopes;
  if (!Array.isArray(possible) || !possible.length) {
    throw new Error(`Permission '${permissionKey}' does not have any possibleScopes configured.`);
  }

  if (roleScope === SCOPES.MY || possible.includes(SCOPES.MY)) {
    return SCOPES.MY;
  }

  if (possible.includes(roleScope)) return roleScope;
  const below = SCOPE_ORDER.filter(
    (s) => possible.includes(s) && scopeRank(s) < scopeRank(roleScope),
  );
  return below.length ? below[below.length - 1] : roleScope;
}

/**
 * Centrally expands a list of permission objects based on the `dependentOn` property in PERMISSIONS.
 * Preserves all original properties while setting the permission key for implied permissions.
 *
 * @param {Array<Object>} permissionsList - List of permission objects
 * @returns {Array<Object>} Deduplicated expanded permissions list
 */
export function expandPermissions(permissionsList = []) {
  const expandedMap = new Map();

  function addPerm(item) {
    if (!item) return;
    const permKey = item.permission || item.permissionKey;
    if (!permKey) return;

    const roleIdStr = item.roleId !== undefined && item.roleId !== null ? item.roleId : "";
    const scopeStr = item.scope || item.scopeKey || "";
    const resIdStr = item.resourceId !== undefined && item.resourceId !== null
      ? item.resourceId
      : (Array.isArray(item.resourceIds) ? item.resourceIds.join(",") : (item.resourceIds || ""));

    const compositeKey = `${permKey}:${roleIdStr}:${scopeStr}:${resIdStr}`;
    const isExistingImplied = expandedMap.has(compositeKey) ? expandedMap.get(compositeKey).isImplied : false;
    const isNewImplied = !!item.isImplied;

    if (!expandedMap.has(compositeKey) || (isExistingImplied && !isNewImplied)) {
      expandedMap.set(compositeKey, item);

      const permDef = PERMISSIONS[permKey];
      if (permDef && Array.isArray(permDef.dependentOn)) {
        for (const depKey of permDef.dependentOn) {
          const newItem = {
            ...item,
            isImplied: true,
          };
          if (item.permission !== undefined) {
            newItem.permission = depKey;
          }
          if (item.permissionKey !== undefined) {
            newItem.permissionKey = depKey;
          }
          addPerm(newItem);
        }
      }
    }
  }

  permissionsList.forEach(addPerm);
  return Array.from(expandedMap.values());
}
