import * as model from "../models/index.js";
import { Op } from "sequelize";
import { SCOPES } from "../const/scopes.js";

/**
 * Centrally resolves a user's permissions for a given active role.
 * Queries the single `user_role_permission_scope` table directly.
 * User can access only one role's permissions at a time (active/selected role).
 *
 * @param {number} userId - The user's ID
 * @param {number} roleId - The active role ID
 * @returns {Promise<Array<{permissionKey: string, scopeKey: string}>>} Resolved permission-scope list
 */
export async function getUserPermissions(userId, roleId) {
  if (!roleId) {
    return [];
  }

  // 2. Query user_role_permission_scope for this user + role
  const entries = await model.userRolePermissionModel.findAll({
    where: { userId, roleId },
    attributes: ['permission', 'scope', 'resourceId']
  });

  // 3. Build permission map (grouping multiple resourceIds)
  const permissionMap = {};
  entries.forEach(e => {
    if (!permissionMap[e.permission]) {
      permissionMap[e.permission] = {
        permissionKey: e.permission,
        scopeKey: e.scope,
        resourceIds: []
      };
    }
    if (e.resourceId) {
      permissionMap[e.permission].resourceIds.push(e.resourceId);
    }
  });

  return Object.values(permissionMap);
}

/**
 * Pluggable Scope Resolvers
 * Each resolver takes a userId and returns an array of allowed IDs for that scope,
 * or 'ALL' if it grants global access.
 */
export const scopeResolvers = {
  [SCOPES.OWN]: async (userId) => {
    return [userId];
  },

  [SCOPES.CLASS]: async (userId) => {
    // Resolve classSectionIds mapped to teacher
    const mappings = await model.teacherSectionMappingModel.findAll({
      where: { userId }
    });
    return mappings.map(m => m.classSectionsId);
  },

  [SCOPES.DEPARTMENT]: async (userId) => {
    // Resolve departmentIds mapped to user/HOD
    const mappings = await model.hodDepartmentModel.findAll({
      where: { userId }
    });
    return mappings.map(m => m.departmentId);
  },

  [SCOPES.INSTITUTE]: async (userId) => {
    const employee = await model.employeeModel.findOne({ where: { userId } });
    return employee ? [employee.instituteId] : [];
  },

  [SCOPES.CAMPUS]: async (userId) => {
    const employee = await model.employeeModel.findOne({ where: { userId } });
    return employee ? [employee.campusId] : [];
  },

  [SCOPES.UNIVERSITY]: async (userId) => {
    return 'ALL';
  }
};

// Resource field mapping configurations
const resourceScopeFields = {
  student: {
    OWN: 'userId',
    CLASS: 'class_sections_id',
    DEPARTMENT: 'departmentId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  employee: {
    OWN: 'userId',
    DEPARTMENT: 'department',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  leaveRequest: {
    OWN: 'userId',
    DEPARTMENT: 'userId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId' // Assuming leave request might have campusId or falls back
  },
  attendance: {
    CLASS: 'class_sections_id',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  default: {
    OWN: 'userId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  }
};

/**
 * Centralized authorization engine filter builder.
 * Generates the Sequelize where condition for a resource query.
 *
 * @param {object} user - The requesting user object (req.user)
 * @param {string} permissionKey - The required permission key
 * @param {string} resource - The target resource entity name
 * @param {number} activeRoleId - The role ID passed down from middleware
 * @returns {Promise<Object>} Filter object
 */
export async function getAccessFilter(user, permissionKey, resource, activeRoleId) {
  const roleId = activeRoleId || user.defaultRoleId;
  const permissions = await getUserPermissions(user.userId, roleId);

  const perm = permissions.find(p => p.permissionKey === permissionKey);
  if (!perm) {
    // Return a filter that resolves to nothing if permission is denied
    return { id: -1 };
  }

  const scope = perm.scopeKey;
  let targets = perm.resourceIds || [];

  // If no explicit resourceIds are defined in the override, fallback to dynamic resolvers
  if (targets.length === 0) {
    const resolver = scopeResolvers[scope];
    if (resolver) {
      targets = await resolver(user.userId);
    }
  }

  if (targets === 'ALL') {
    return {}; // No additional filters needed (multi-tenancy scoped automatically)
  }

  if (!targets || targets.length === 0) {
    return { id: -1 };
  }

  // Find mapping fields for this resource
  const mapping = resourceScopeFields[resource] || resourceScopeFields.default;
  const fieldName = mapping[scope];

  if (!fieldName) {
    // Fallback: If scope lacks explicit field mapping, resolve user IDs if possible
    if (scope === SCOPES.DEPARTMENT) {
      // Find all employees belonging to these departments
      const employees = await model.employeeModel.findAll({
        where: { department: { [Op.in]: targets } },
        attributes: ['userId']
      });
      const userIds = employees.map(e => e.userId);
      return { userId: { [Op.in]: userIds } };
    }
    return { id: -1 };
  }

  // Build operator clause
  if (targets.length === 1) {
    return { [fieldName]: targets[0] };
  }
  return { [fieldName]: { [Op.in]: targets } };
}
