import { requestContext } from "../utility/requestContext.js";
import { getAccessFilter, getUserPermissions } from "../utility/authEngine.js";

/**
 * Middleware to centrally evaluate permissions and inject access filters
 * for queries in subsequent routes/controllers.
 *
 * Usage in routes:
 *   router.get('/', userAuth, checkAccess(PERMISSIONS.STUDENT_LIST.value, 'student'), controller);
 *
 * @param {string} permissionKey - Key identifying the requested action (e.g. 'perm_p0nsudou')
 * @param {string} resource - Target resource entity name (e.g. 'student', 'employee')
 */
export function checkAccess(permissionKey, resource) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User context not found" });
      }

      const activeRoleId = req.user.defaultRoleId;
      const filter = await getAccessFilter(req.user, permissionKey, resource, activeRoleId);

      // Block request immediately if the filter is set to the denial signature ({ id: -1 })
      if (filter && filter.id === -1) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }

      req.accessFilter = filter;

      // Resolve the user's scope for this permission so scoped.js can make hierarchy decisions
      const permissions = await getUserPermissions(req.user.userId, activeRoleId);
      const perm = permissions.find(p => p.permissionKey === permissionKey);
      const permissionScope = perm?.scopeKey || null;

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
}
