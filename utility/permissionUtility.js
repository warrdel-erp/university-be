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

    if (!expandedMap.has(permKey)) {
      expandedMap.set(permKey, item);

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
