import { PERMISSIONS } from "../const/permissions.js";

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
      : (Array.isArray(item.resourceIds) ? item.resourceIds.join(",") : "");

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
