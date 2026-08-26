import { requestContext } from "../utility/requestContext.js";
import { getAccessFilter } from "../utility/authEngine.js";

/**
 * Middleware to centrally evaluate permissions and inject access filters
 * for queries in subsequent routes/controllers.
 *
 * Usage in routes:
 *   router.get('/', userAuth, checkAccess(PERMISSIONS.STUDENT_LIST.value), controller);
 *
 * @param {string} permissionKey - Key identifying the requested action (e.g. 'perm_p0nsudou')
 */
export function checkAccess(permissionKey) {
  const func = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User context not found" });
      }

      // Special case: if the user is flagged as a teacher, bypass all permission checks.
      if (req.user.isTeacher === true) {
        req.accessFilter = null;
        const store = requestContext.getStore();
        if (store) {
          store.accessFilter = null;
          store.permissionScope = null;
        }
        return next();
      }

      const activeRoleId = req.user.defaultRoleId;

      if (!activeRoleId) {
        return res.status(403).json({ message: "Access denied: User's default role is not configured" });
      }

      const { filter, scope: permissionScope } = await getAccessFilter(req.user, permissionKey, activeRoleId);

      // Block request immediately if the filter is set to the denial signature ({ id: -1 })
      if (filter && filter.id === -1) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }

      req.accessFilter = filter;

      console.log('accessFilter', req.accessFilter, permissionScope)
      // Inject into the AsyncLocalStorage active store
      const store = requestContext.getStore();
      if (store) {
        store.accessFilter = filter;
        store.permissionScope = permissionScope;
      }

      next();
    } catch (error) {
      console.error("Authorization evaluation failed:", error);
      return res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }
  };

  return func
}

/**
 * Middleware to centrally evaluate multiple permissions and allow access if ANY of them are met.
 * Uses the first valid permission found to set scope and filters.
 *
 * @param {string[]} permissionKeys - Array of keys identifying the requested action
 */
export function checkAccessAny(permissionKeys) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User context not found" });
      }

      // Special case: if the user is flagged as a teacher, bypass all permission checks.
      if (req.user.isTeacher === true) {
        req.accessFilter = null;
        const store = requestContext.getStore();
        if (store) {
          store.accessFilter = null;
          store.permissionScope = null;
        }
        return next();
      }

      const activeRoleId = req.user.defaultRoleId;

      if (!activeRoleId) {
        return res.status(403).json({ message: "Access denied: User's default role is not configured" });
      }

      let validFilter = null;
      let validScope = null;
      let hasAccess = false;

      for (const key of permissionKeys) {
        const { filter, scope } = await getAccessFilter(req.user, key, activeRoleId);
        if (filter && filter.id !== -1) {
          hasAccess = true;
          validFilter = filter;
          validScope = scope;
          break;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }

      req.accessFilter = validFilter;

      const store = requestContext.getStore();
      if (store) {
        store.accessFilter = validFilter;
        store.permissionScope = validScope;
      }

      next();
    } catch (error) {
      console.error("Authorization evaluation failed:", error);
      return res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }
  };
}
